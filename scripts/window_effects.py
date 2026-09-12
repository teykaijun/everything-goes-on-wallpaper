"""Deterministic, periodic RGBA light effects; never opens or modifies source artwork."""
from math import sin, cos, pi, exp, hypot
from random import Random
from PIL import Image, ImageDraw, ImageFilter

TAU = 2 * pi


class WindowEffects:
    def __init__(self, phase, width=720, height=1280, duration=24):
        if phase not in ('day', 'night'):
            raise ValueError('phase must be day or night')
        self.phase, self.width, self.height, self.duration = phase, width, height, duration
        self.scale = width / 720
        self.glows = {}
        rng = Random(2109 if phase == 'day' else 2209)
        self.dust = [(rng.uniform(.11, .89), rng.uniform(.16, .94), rng.uniform(.6, 1.6),
                      rng.uniform(0, TAU), rng.choice((1, 2)), rng.uniform(.006, .018)) for _ in range(38 if phase == 'day' else 14)]
        self.stars = [(.32,.087),(.68,.105),(.25,.241),(.403,.271),(.65,.245),(.784,.30),
                      (.256,.404),(.387,.443),(.684,.376),(.761,.436),(.363,.57),(.681,.552)]
        self.shafts = self._sunshafts() if phase == 'day' else []

    def _point(self, x, y):
        return x*self.width, y*self.height

    def _glow(self, color, radius):
        radius = max(2, round(radius*self.scale))
        key = (color, radius)
        if key not in self.glows:
            size = radius*2+1
            mask = Image.new('L', (size, size))
            mask.putdata([round(210*exp(-4*((x-radius)**2+(y-radius)**2)/(radius*radius)))
                          for y in range(size) for x in range(size)])
            image = Image.new('RGBA', (size, size), (*color, 0))
            image.putalpha(mask)
            self.glows[key] = image
        return self.glows[key]

    def _stamp(self, layer, x, y, color, radius, opacity=1):
        stamp = self._glow(color, radius).copy()
        opacity = max(0, min(1, opacity))
        stamp.putalpha(stamp.getchannel('A').point([round(v*opacity) for v in range(256)]))
        layer.alpha_composite(stamp, (round(x-stamp.width/2), round(y-stamp.height/2)))

    def _sunshafts(self):
        result = []
        for points in [[(.19,.19),(.255,.19),(.64,.97),(.49,.97)],
                       [(.63,.08),(.675,.08),(.83,.96),(.72,.96)]]:
            image = Image.new('RGBA', (self.width, self.height))
            ImageDraw.Draw(image).polygon([self._point(x,y) for x,y in points], fill=(255,225,160,48))
            result.append(image.filter(ImageFilter.GaussianBlur(16*self.scale)))
        return result

    def _glint(self, layer, x, y, radius, brightness, color=(210,247,255)):
        if brightness < .015:
            return
        self._stamp(layer, x, y, color, radius*2.6/self.scale, brightness*.5)
        draw = ImageDraw.Draw(layer)
        r, w = radius, radius*.63
        points = [(x,y-r),(x+w*.15,y-r*.15),(x+w,y),(x+w*.15,y+r*.15),
                  (x,y+r),(x-w*.15,y+r*.15),(x-w,y),(x-w*.15,y-r*.15)]
        draw.polygon(points, fill=(*color, round(240*brightness)))
        core = max(.55*self.scale, radius*.105)
        draw.ellipse((x-core,y-core,x+core,y+core), fill=(255,255,248,round(255*brightness)))

    def _gold_star(self, layer, x, y, radius, angle, glow):
        self._stamp(layer, x, y, (255,190,98), radius*3/self.scale, glow)
        draw = ImageDraw.Draw(layer)
        outer = [(x+cos(angle-pi/2+i*pi/5)*radius*(1 if i%2==0 else .45),
                  y+sin(angle-pi/2+i*pi/5)*radius*(1 if i%2==0 else .45)) for i in range(10)]
        draw.polygon(outer, fill=(255,210,105,248))
        # Faceted warm surfaces keep the motes sculptural rather than outlined symbols.
        for i in range(0,10,2):
            draw.polygon([(x,y),outer[i],outer[(i+1)%10]], fill=(255,241,172,246))
            draw.polygon([(x,y),outer[(i-1)%10],outer[i]], fill=(244,170,76,240))
        inner=[(x+(px-x)*.48,y+(py-y)*.48) for px,py in outer]
        draw.polygon(inner,fill=(255,250,204,248))
        draw.line([(x-radius*.22,y-radius*.35),(x,y-radius*.08)],fill=(255,255,240,235),width=max(1,round(self.scale)))

    def _orbit(self, phase, which):
        if which == 0:
            cx,cy,rx,ry,offset=.322,.256,.063,.045,.30
            angle=phase+offset
        else:
            cx,cy,rx,ry,offset=.714,.607,.082,.035,2.05
            angle=-phase+offset
        return self._point(cx+rx*cos(angle)+.005*sin(3*angle),cy+ry*sin(angle)),angle

    def render(self, seconds):
        # Every frequency is integral over the period. t=24 and t=0 are identical.
        phase=TAU*((seconds % self.duration)/self.duration)
        layer=Image.new('RGBA',(self.width,self.height))
        if self.phase == 'day':
            for index,shaft in enumerate(self.shafts):
                light=shaft.copy()
                strength=.58+.32*sin(phase+index*2.3)
                light.putalpha(light.getchannel('A').point([round(v*strength) for v in range(256)]))
                layer.alpha_composite(light,(round(self.width*.025*sin(phase+index)),0))
        else:
            # These anchors match the actual illustrated star lantern and pink crystal.
            for x,y,color,radius,offset in [(.292,.702,(104,236,255),48,.4),(.878,.706,(255,124,238),36,2.2)]:
                px,py=self._point(x,y)
                self._stamp(layer,px,py,color,radius,.32+.19*sin(phase*3+offset))
                self._stamp(layer,px,py,color,radius*.47,.16+.10*sin(phase*3+offset))
            bloom=Image.new('RGBA',layer.size)
            ribbons=Image.new('RGBA',layer.size)
            bloom_draw, ribbon_draw=ImageDraw.Draw(bloom),ImageDraw.Draw(ribbons)
            colors=[(255,127,225),(166,143,255),(141,229,255)]
            for orbit in range(2):
                for strand,color in enumerate(colors):
                    points=[]
                    for step in range(30):
                        behind=step*.029
                        position,angle=self._orbit(phase-behind,orbit)
                        flutter=(strand-1)*3*self.scale*sin(phase*3-step*.20+strand)
                        points.append((position[0]+flutter,position[1]+flutter*.7))
                    for step in range(len(points)-1,0,-1):
                        strength=(1-step/len(points))**1.55
                        bloom_draw.line([points[step],points[step-1]],fill=(*color,round(82*strength)),width=max(2,round(10*self.scale)))
                        ribbon_draw.line([points[step],points[step-1]],fill=(*color,round(148*strength)),width=max(1,round((1.1+strand*.3)*self.scale)))
            # A small flowing wisp rises from the open book and fades before wrapping.
            for stream in range(2):
                head=((seconds/self.duration)+stream*.5)%1
                previous=None
                for step in range(34, -1, -1):
                    u=(head-step*.0045)%1
                    x=.69+.044*sin(u*TAU*1.5+stream*pi)
                    y=.645-.115*u
                    position=self._point(x,y)
                    strength=(1-step/35)**1.6*sin(pi*u)**2
                    if previous and abs(position[1]-previous[1])<self.height*.03:
                        color=(144,231,255) if stream==0 else (219,163,255)
                        bloom_draw.line([previous,position],fill=(*color,round(72*strength)),width=max(2,round(8*self.scale)))
                        ribbon_draw.line([previous,position],fill=(*color,round(122*strength)),width=max(1,round(self.scale)))
                    previous=position
            layer.alpha_composite(bloom.filter(ImageFilter.GaussianBlur(5*self.scale)))
            layer.alpha_composite(ribbons)
            for orbit in range(2):
                (x,y),angle=self._orbit(phase,orbit)
                self._gold_star(layer,x,y,(11 if orbit==0 else 9.3)*self.scale,.20*sin(phase*2+orbit),.62+.12*sin(phase*2+orbit))
            for index,(sx,sy) in enumerate(self.stars):
                x,y=self._point(sx+.004*sin(phase+index),sy+.003*cos(phase*2+index))
                pulse=(.5+.5*sin(phase*(3+index%3)+index*1.77))**3
                self._glint(layer,x,y,(4.5+(index%3)*1.6)*self.scale,.16+.84*pulse)
        # Floating points are light, never texture edits or simulated camera movement.
        draw=ImageDraw.Draw(layer)
        for index,(sx,sy,radius,offset,frequency,travel) in enumerate(self.dust):
            x,y=self._point(sx+.009*sin(phase*frequency+offset),sy+travel*cos(phase*frequency+offset))
            brightness=.35+.45*(.5+.5*sin(phase*(2+index%3)+offset))
            color=(255,219,132) if self.phase=='day' else (191,221,255)
            radius*=self.scale
            self._stamp(layer,x,y,color,6,brightness*.42)
            draw=ImageDraw.Draw(layer)
            draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill=(*color,round(205*brightness)))
            if self.phase=='day' and index%9==0:
                self._glint(layer,x,y,radius*2.8,brightness*.7,(255,240,188))
        return layer