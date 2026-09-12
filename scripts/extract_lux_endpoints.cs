using System.Numerics;
using System.Text.Json;
using LeagueToolkit.Core.Animation;
var result = new Dictionary<string, object>();
foreach (var path in Directory.GetFiles(args[0], "*.anm")) {
 using var stream = File.OpenRead(path);
 using var animation = AnimationAsset.Load(stream);
 var pose = new Dictionary<uint,(Quaternion Rotation, Vector3 Translation, Vector3 Scale)>();
 animation.Evaluate(animation.Duration, pose);
 result[Path.GetFileNameWithoutExtension(path)] = new { duration=animation.Duration, fps=animation.Fps,
  joints=pose.ToDictionary(p=>p.Key.ToString("x8"),p=>new {rotation=new[]{p.Value.Rotation.X,p.Value.Rotation.Y,p.Value.Rotation.Z,p.Value.Rotation.W},translation=new[]{p.Value.Translation.X,p.Value.Translation.Y,p.Value.Translation.Z},scale=new[]{p.Value.Scale.X,p.Value.Scale.Y,p.Value.Scale.Z}})};
}
File.WriteAllText(args[1], JsonSerializer.Serialize(result));
Console.WriteLine($"Evaluated native endpoints for {result.Count} clips.");
