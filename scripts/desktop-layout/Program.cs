using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

internal static class Program
{
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };

    [STAThread]
    static int Main(string[] args)
    {
        try
        {
            if (args.Length == 0 || args[0] is "--help" or "help")
            {
                Console.WriteLine("DesktopLayout inventory <output.json>\nDesktopLayout apply <plan.json> --backup <before.json> [--dry-run]\nDesktopLayout restore <snapshot.json> --backup <before-restore.json> [--dry-run]\n\nInventory and dry-run never change the desktop. Output backups are never overwritten.\nPlan: { coordinateSpace: \"screen\", items: [{ id: \"snapshot id\", x: 100, y: 100 }] }");
                return 0;
            }
            if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows is required.");
            Native.SetProcessDpiAwarenessContext(new IntPtr(-4)); // Per-monitor-v2, before creating any COM objects.
            Native.Check(Native.CoInitializeEx(IntPtr.Zero, 2), "CoInitializeEx");
            try
            {
                using var desktop = new Desktop();
                if (args[0] == "inventory")
                {
                    if (args.Length != 2) throw new ArgumentException("inventory requires exactly one output path.");
                    var snapshot = desktop.Capture();
                    WriteNew(args[1], snapshot);
                    Console.WriteLine(JsonSerializer.Serialize(new { output = Path.GetFullPath(args[1]), count = snapshot.Items.Count, snapshot.FolderFlags, snapshot.IconSize, snapshot.Spacing, snapshot.ViewOrigin, snapshot.Monitors, items = snapshot.Items.Select(i => new { i.Name, i.Id, i.ViewPosition, i.ScreenPosition, i.Monitor }) }, Json));
                    return 0;
                }
                if (args[0] is not ("apply" or "restore")) throw new ArgumentException("Unknown command; use --help.");
                if (args.Length < 2) throw new ArgumentException("A plan or snapshot path is required.");
                var dryRun = args.Contains("--dry-run");
                var backupIndex = Array.IndexOf(args, "--backup");
                if (backupIndex < 0 || backupIndex + 1 >= args.Length) throw new ArgumentException("--backup <new file> is required for apply/restore, including dry-run review.");
                var backupPath = Path.GetFullPath(args[backupIndex + 1]);
                if (File.Exists(backupPath) || File.Exists(backupPath + ".after.json")) throw new IOException("Backup output already exists; choose a new path. No desktop changes made.");
                var before = desktop.Capture();
                LayoutPlan plan;
                if (args[0] == "restore")
                {
                    var original = Read<Snapshot>(args[1]);
                    if (original.SchemaVersion != 1) throw new ArgumentException("Unsupported snapshot version.");
                    EnsureSameMonitors(original.Monitors, before.Monitors);
                    plan = new LayoutPlan {
                        Name = "restore-original",
                        CoordinateSpace = "view",
                        IconSize = original.IconSize,
                        ViewMode = original.ViewMode,
                        AutoArrange = (original.FolderFlags & 1) != 0,
                        SnapToGrid = (original.FolderFlags & 4) != 0,
                        Items = original.Items.Select(i => new Placement { Id = i.Id, ParsingName = i.ParsingName, X = i.ViewPosition.X, Y = i.ViewPosition.Y }).ToList()
                    };
                }
                else plan = Read<LayoutPlan>(args[1]);
                var targets = ResolvePlan(plan, before);
                Console.WriteLine(JsonSerializer.Serialize(new { command = args[0], dryRun, name = plan.Name, backup = backupPath, count = targets.Count, coordinateSpace = plan.CoordinateSpace, plan.IconSize, targets = targets.Select(t => new { t.Item.Name, t.Item.Id, from = t.Item.ViewPosition, to = t.Point }) }, Json));
                if (dryRun) return 0;
                WriteNew(backupPath, before); // Must succeed before any mutation.
                try
                {
                    desktop.Apply(plan, targets);
                    var after = desktop.Capture();
                    // Exact coordinates can be reflowed intentionally when restoring auto-arrange or grid.
                    if (!plan.AutoArrange && !plan.SnapToGrid)
                    {
                        foreach (var target in targets)
                        {
                            var actual = after.Items.SingleOrDefault(i => i.Id == target.Item.Id || i.ParsingName == target.Item.ParsingName);
                            if (actual == null || actual.ViewPosition != target.Point)
                                throw new IOException("Explorer did not retain the requested position for " + target.Item.Name);
                        }
                    }
                    WriteNew(backupPath + ".after.json", after);
                    Console.WriteLine("Applied and verified. Restore source: " + backupPath);
                }
                catch
                {
                    // Restore only the settings this helper can change, then the captured positions.
                    var rollback = new LayoutPlan {
                        CoordinateSpace = "view", IconSize = before.IconSize, ViewMode = before.ViewMode,
                        AutoArrange = (before.FolderFlags & 1) != 0, SnapToGrid = (before.FolderFlags & 4) != 0,
                        Items = before.Items.Select(i => new Placement { Id = i.Id, ParsingName = i.ParsingName, X = i.ViewPosition.X, Y = i.ViewPosition.Y }).ToList()
                    };
                    try { desktop.Apply(rollback, ResolvePlan(rollback, desktop.Capture())); Console.Error.WriteLine("Restored the pre-change snapshot after a failure."); }
                    catch (Exception error) { Console.Error.WriteLine("Automatic restore failed: " + error.Message + ". The original backup is preserved at " + backupPath); }
                    throw;
                }
                return 0;
            }
            finally { Native.CoUninitialize(); }
        }
        catch (Exception e) { Console.Error.WriteLine(e.GetType().Name + ": " + e.Message); return 1; }
    }

    private static T Read<T>(string path) => JsonSerializer.Deserialize<T>(File.ReadAllText(path), Json) ?? throw new ArgumentException("Invalid JSON: " + path);
    private static void WriteNew<T>(string path, T data)
    {
        path = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        JsonSerializer.Serialize(stream, data, Json);
    }
    private static void EnsureSameMonitors(List<MonitorData> expected, List<MonitorData> actual)
    {
        if (expected.Count != actual.Count || expected.Any(e => !actual.Any(a => a.Device == e.Device && a.Bounds == e.Bounds)))
            throw new ArgumentException("Monitor arrangement has changed. Review and remap the saved positions instead of restoring blindly.");
    }
    private static List<Target> ResolvePlan(LayoutPlan plan, Snapshot before)
    {
        if (plan.SchemaVersion != 1) throw new ArgumentException("Unsupported plan version.");
        if (plan.Monitors != null) EnsureSameMonitors(plan.Monitors, before.Monitors);
        if (plan.CoordinateSpace is not ("screen" or "view")) throw new ArgumentException("coordinateSpace must be screen or view.");
        if (plan.Items.Count == 0) throw new ArgumentException("The plan has no items.");
        if (plan.IconSize is < 16 or > 256) throw new ArgumentException("iconSize must be between 16 and 256.");
        var targets = new List<Target>();
        var used = new HashSet<string>();
        var positions = new HashSet<Point>();
        foreach (var p in plan.Items)
        {
            var candidates = before.Items.Where(i => (!string.IsNullOrEmpty(p.Id) && i.Id == p.Id) || (!string.IsNullOrEmpty(p.ParsingName) && i.ParsingName.Equals(p.ParsingName, StringComparison.OrdinalIgnoreCase))).ToList();
            if (candidates.Count != 1) throw new ArgumentException("Placement identity is missing or ambiguous: " + p.Id + " " + p.ParsingName);
            var item = candidates[0];
            if (!used.Add(item.Id)) throw new ArgumentException("Duplicate item: " + item.Name);
            var point = new Point(p.X, p.Y);
            if (plan.CoordinateSpace == "screen") point = new Point(point.X - before.ViewOrigin.X, point.Y - before.ViewOrigin.Y);
            var screen = new Point(point.X + before.ViewOrigin.X, point.Y + before.ViewOrigin.Y);
            var size = plan.IconSize ?? before.IconSize;
            if (!before.Monitors.Any(m => screen.X >= m.WorkArea.Left && screen.Y >= m.WorkArea.Top && screen.X + size <= m.WorkArea.Right && screen.Y + size <= m.WorkArea.Bottom))
                throw new ArgumentException("Position is outside active monitor working areas: " + item.Name);
            if (!positions.Add(point)) throw new ArgumentException("Two icons share the same target position.");
            targets.Add(new Target(item, point));
        }
        return targets;
    }
}

internal sealed class Desktop : IDisposable
{
    private readonly List<IntPtr> owned = [];
    private readonly IntPtr view, shellView, viewWindow;
    public Desktop()
    {
        var clsid = new Guid("9BA05972-F6A8-11CF-A442-00A0C90A8F39");
        var iidWindows = new Guid("85CB6900-4D95-11CF-960C-0080C7F4EE85");
        Native.Check(Native.CoCreateInstance(ref clsid, IntPtr.Zero, 5, ref iidWindows, out var windows), "Create ShellWindows"); Own(windows);
        var location = new Variant { Type = 3, IntValue = 0 }; // VT_I4, CSIDL_DESKTOP
        var empty = new Variant();
        Native.Check(Native.Method<Native.FindWindowSW>(windows, 15)(windows, ref location, ref empty, 8, out _, 1, out var dispatch), "Find desktop shell window"); Own(dispatch);
        var serviceProvider = Query(dispatch, "6D5140C1-7436-11CE-8034-00AA006009FA");
        var service = new Guid("4C96BE40-915C-11CF-99D3-00AA004AE837");
        var iidBrowser = new Guid("000214E2-0000-0000-C000-000000000046");
        Native.Check(Native.Method<Native.QueryService>(serviceProvider, 3)(serviceProvider, ref service, ref iidBrowser, out var browser), "Query desktop browser"); Own(browser);
        Native.Check(Native.Method<Native.GetPointer>(browser, 15)(browser, out shellView), "Query active desktop view"); Own(shellView);
        view = Query(shellView, "1AF3A467-214F-4298-908E-06B03E0B39F9");
        Native.Check(Native.Method<Native.GetPointer>(shellView, 3)(shellView, out viewWindow), "Get desktop view window");
        if (viewWindow == IntPtr.Zero) throw new InvalidOperationException("Desktop view has no window.");
    }
    private void Own(IntPtr pointer) { if(pointer == IntPtr.Zero) throw new InvalidOperationException("Shell returned a null interface."); owned.Add(pointer); }
    private IntPtr Query(IntPtr source, string id)
    {
        var iid = new Guid(id);
        Native.Check(Marshal.QueryInterface(source, in iid, out var result), "QueryInterface " + id); Own(result); return result;
    }
    public Snapshot Capture()
    {
        Native.Check(Native.Method<Native.GetUInt>(view, 25)(view, out var flags), "Get folder flags");
        Native.Check(Native.Method<Native.GetViewModeAndIconSize>(view, 36)(view, out var mode, out var iconSize), "Get icon size");
        Native.Check(Native.Method<Native.GetPoint>(view, 12)(view, out var spacing), "Get icon spacing");
        var origin = new Point();
        if(!Native.ClientToScreen(viewWindow, ref origin)) throw new InvalidOperationException("Could not map desktop-view coordinates.");
        var monitors = Native.Monitors();
        var snapshot = new Snapshot { CapturedAtUtc = DateTimeOffset.UtcNow, FolderFlags = flags, ViewMode = mode, IconSize = iconSize, Spacing = spacing, ViewOrigin = origin, Dpi = Native.GetDpiForWindow(viewWindow), Monitors = monitors };
        Native.Check(Native.Method<Native.ItemCount>(view, 7)(view, 2, out var count), "Count actual desktop-view items");
        for (var index = 0; index < count; index++)
        {
            Native.Check(Native.Method<Native.Item>(view, 6)(view, index, out var pidl), "Read desktop item");
            try
            {
                Native.Check(Native.Method<Native.GetItemPosition>(view, 11)(view, pidl, out var point), "Read desktop item position");
                var bytes = Native.CopyPidl(pidl);
                var name = Native.Name(pidl, 0);
                var parsing = Native.Name(pidl, 0x80028000); // SIGDN_DESKTOPABSOLUTEPARSING
                var screen = new Point(point.X + origin.X, point.Y + origin.Y);
                snapshot.Items.Add(new DesktopItem {
                    Id = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(),
                    Name = name, ParsingName = parsing, PidlBase64 = Convert.ToBase64String(bytes),
                    ViewPosition = point, ScreenPosition = screen,
                    Monitor = monitors.FirstOrDefault(m => screen.X >= m.Bounds.Left && screen.X < m.Bounds.Right && screen.Y >= m.Bounds.Top && screen.Y < m.Bounds.Bottom)?.Device
                });
            }
            finally { Marshal.FreeCoTaskMem(pidl); }
        }
        return snapshot;
    }
    public void Apply(LayoutPlan plan, List<Target> targets)
    {
        // Explicitly disable automatic repositioning before applying exact coordinates.
        Native.Check(Native.Method<Native.SetFolderFlags>(view, 24)(view, 5, 0), "Disable auto-arrange and grid for positioning");
        if (plan.IconSize.HasValue)
        {
            Native.Check(Native.Method<Native.GetViewModeAndIconSize>(view, 36)(view, out var currentMode, out _), "Read current view mode");
            Native.Check(Native.Method<Native.SetViewModeAndIconSize>(view, 35)(view, plan.ViewMode ?? currentMode, plan.IconSize.Value), "Set requested icon size");
        }
        var pidls = new List<IntPtr>();
        var pointers = Marshal.AllocCoTaskMem(targets.Count * IntPtr.Size);
        var points = Marshal.AllocCoTaskMem(targets.Count * Marshal.SizeOf<Point>());
        try
        {
            for (var i = 0; i < targets.Count; i++)
            {
                var bytes = Convert.FromBase64String(targets[i].Item.PidlBase64);
                var pidl = Marshal.AllocCoTaskMem(bytes.Length); Marshal.Copy(bytes, 0, pidl, bytes.Length); pidls.Add(pidl);
                Marshal.WriteIntPtr(pointers, i * IntPtr.Size, pidl);
                Marshal.StructureToPtr(targets[i].Point, points + i * Marshal.SizeOf<Point>(), false);
            }
            // Position without altering focus/selection. No window-message or input simulation.
            Native.Check(Native.Method<Native.SelectAndPositionItems>(view, 16)(view, (uint)targets.Count, pointers, points, 0x80000080), "Position desktop icons");
            uint desired = (plan.AutoArrange ? 1u : 0u) | (plan.SnapToGrid ? 4u : 0u);
            Native.Check(Native.Method<Native.SetFolderFlags>(view, 24)(view, 5, desired), "Apply requested arrangement flags");
        }
        finally { foreach(var pidl in pidls) Marshal.FreeCoTaskMem(pidl); Marshal.FreeCoTaskMem(pointers); Marshal.FreeCoTaskMem(points); }
    }
    public void Dispose() { for(var i = owned.Count - 1; i >= 0; i--) Marshal.Release(owned[i]); owned.Clear(); }
}

internal static class Native
{
    // COM slots follow Microsoft's public ShObjIdl_core.h / ExDisp.h declarations.
    internal static T Method<T>(IntPtr instance, int slot) where T : Delegate =>
        Marshal.GetDelegateForFunctionPointer<T>(Marshal.ReadIntPtr(Marshal.ReadIntPtr(instance), slot * IntPtr.Size));
    internal static void Check(int hr, string operation) { if(hr < 0) throw new COMException(operation + " failed: 0x" + hr.ToString("X8"), hr); }
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int FindWindowSW(IntPtr self, ref Variant location, ref Variant root, int classes, out int window, int options, out IntPtr dispatch);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int QueryService(IntPtr self, ref Guid service, ref Guid iid, out IntPtr result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int GetPointer(IntPtr self, out IntPtr result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int GetUInt(IntPtr self, out uint result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int GetPoint(IntPtr self, out Point result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int GetViewModeAndIconSize(IntPtr self, out uint mode, out int size);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int SetViewModeAndIconSize(IntPtr self, uint mode, int size);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int ItemCount(IntPtr self, uint flags, out int count);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int Item(IntPtr self, int index, out IntPtr pidl);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int GetItemPosition(IntPtr self, IntPtr pidl, out Point result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int SetFolderFlags(IntPtr self, uint mask, uint flags);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] internal delegate int SelectAndPositionItems(IntPtr self, uint count, IntPtr pidls, IntPtr points, uint flags);
    [DllImport("ole32.dll")] internal static extern int CoInitializeEx(IntPtr reserved, uint apartment);
    [DllImport("ole32.dll")] internal static extern void CoUninitialize();
    [DllImport("ole32.dll")] internal static extern int CoCreateInstance(ref Guid clsid, IntPtr outer, uint context, ref Guid iid, out IntPtr result);
    [DllImport("shell32.dll")] private static extern uint ILGetSize(IntPtr pidl);
    [DllImport("shell32.dll", CharSet=CharSet.Unicode)] private static extern int SHGetNameFromIDList(IntPtr pidl, uint kind, out IntPtr name);
    [DllImport("user32.dll")] [return:MarshalAs(UnmanagedType.Bool)] internal static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] [return:MarshalAs(UnmanagedType.Bool)] internal static extern bool ClientToScreen(IntPtr window, ref Point point);
    [DllImport("user32.dll")] internal static extern uint GetDpiForWindow(IntPtr window);
    [DllImport("user32.dll")] private static extern bool EnumDisplayMonitors(IntPtr dc, IntPtr clip, MonitorCallback callback, IntPtr data);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern bool GetMonitorInfoW(IntPtr monitor, ref MonitorInfoEx info);
    private delegate bool MonitorCallback(IntPtr monitor, IntPtr dc, ref Rect rect, IntPtr data);
    internal static List<MonitorData> Monitors()
    {
        var results = new List<MonitorData>();
        MonitorCallback callback = (IntPtr monitor, IntPtr dc, ref Rect rect, IntPtr data) => {
            var info = new MonitorInfoEx { Size = Marshal.SizeOf<MonitorInfoEx>(), Device = "" };
            if(!GetMonitorInfoW(monitor, ref info)) throw new InvalidOperationException("GetMonitorInfo failed.");
            results.Add(new MonitorData { Device = info.Device, Bounds = info.Bounds, WorkArea = info.WorkArea, Primary = (info.Flags & 1) != 0 }); return true;
        };
        if(!EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, callback, IntPtr.Zero)) throw new InvalidOperationException("Monitor enumeration failed.");
        return results.OrderByDescending(m => m.Primary).ThenBy(m => m.Device).ToList();
    }
    internal static byte[] CopyPidl(IntPtr pidl)
    {
        var size = checked((int)ILGetSize(pidl));
        if(size < 2 || size > 65536) throw new InvalidOperationException("Invalid desktop item ID length.");
        var result = new byte[size]; Marshal.Copy(pidl, result, 0, size); return result;
    }
    internal static string Name(IntPtr pidl, uint kind)
    {
        Check(SHGetNameFromIDList(pidl, kind, out var text), "Resolve desktop item name");
        try { return Marshal.PtrToStringUni(text) ?? ""; } finally { Marshal.FreeCoTaskMem(text); }
    }
}
[StructLayout(LayoutKind.Explicit, Size=24)] internal struct Variant { [FieldOffset(0)] public short Type; [FieldOffset(8)] public int IntValue; }
[StructLayout(LayoutKind.Sequential)] internal record struct Point(int X, int Y);
[StructLayout(LayoutKind.Sequential)] internal record struct Rect(int Left, int Top, int Right, int Bottom);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] internal struct MonitorInfoEx { public int Size; public Rect Bounds; public Rect WorkArea; public uint Flags; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string Device; }
internal sealed class MonitorData { public string Device {get;set;} = ""; public Rect Bounds {get;set;} public Rect WorkArea {get;set;} public bool Primary {get;set;} }
internal sealed class DesktopItem { public string Id {get;set;} = ""; public string Name {get;set;} = ""; public string ParsingName {get;set;} = ""; public string PidlBase64 {get;set;} = ""; public Point ViewPosition {get;set;} public Point ScreenPosition {get;set;} public string? Monitor {get;set;} }
internal sealed class Snapshot { public int SchemaVersion {get;set;} = 1; public DateTimeOffset CapturedAtUtc {get;set;} public uint FolderFlags {get;set;} public uint ViewMode {get;set;} public int IconSize {get;set;} public Point Spacing {get;set;} public Point ViewOrigin {get;set;} public uint Dpi {get;set;} public List<MonitorData> Monitors {get;set;} = []; public List<DesktopItem> Items {get;set;} = []; }
internal sealed class LayoutPlan { public int SchemaVersion {get;set;} = 1; public string Name {get;set;} = "desktop-layout"; public string CoordinateSpace {get;set;} = "screen"; public List<MonitorData>? Monitors {get;set;} public bool AutoArrange {get;set;} public bool SnapToGrid {get;set;} public int? IconSize {get;set;} public uint? ViewMode {get;set;} public List<Placement> Items {get;set;} = []; }
internal sealed class Placement { public string? Id {get;set;} public string? ParsingName {get;set;} public int X {get;set;} public int Y {get;set;} }
internal sealed record Target(DesktopItem Item, Point Point);
