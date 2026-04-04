export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface ColorStop {
  readonly elevation: number;
  readonly color: RgbColor;
}

export const COLOR_STOPS: ReadonlyArray<ColorStop> = [
  { elevation: 0,    color: { r: 106, g: 153, b: 88 } },   // Deep green (lowland)
  { elevation: 50,   color: { r: 126, g: 163, b: 100 } },   // Medium green
  { elevation: 100,  color: { r: 152, g: 178, b: 116 } },   // Light green
  { elevation: 200,  color: { r: 184, g: 196, b: 134 } },   // Yellow-green
  { elevation: 300,  color: { r: 210, g: 208, b: 150 } },   // Pale yellow
  { elevation: 500,  color: { r: 224, g: 208, b: 156 } },   // Tan
  { elevation: 700,  color: { r: 214, g: 190, b: 144 } },   // Light brown
  { elevation: 1000, color: { r: 196, g: 168, b: 128 } },   // Medium brown
  { elevation: 1500, color: { r: 176, g: 144, b: 112 } },   // Brown
  { elevation: 2000, color: { r: 160, g: 128, b: 104 } },   // Dark brown
  { elevation: 2500, color: { r: 152, g: 128, b: 112 } },   // Brown-grey
  { elevation: 3000, color: { r: 148, g: 132, b: 120 } },   // Grey-brown
  { elevation: 4000, color: { r: 160, g: 156, b: 148 } },   // Light grey
  { elevation: 5000, color: { r: 176, g: 172, b: 168 } },   // Medium grey
  { elevation: 6000, color: { r: 200, g: 196, b: 192 } },   // Pale grey
  { elevation: 7000, color: { r: 224, g: 220, b: 216 } },   // Near white
  { elevation: 8849, color: { r: 248, g: 244, b: 240 } },   // White (Everest)
];

export function elevationToRgb(elevation: number): RgbColor {
  if (elevation <= COLOR_STOPS[0].elevation) {
    return COLOR_STOPS[0].color;
  }

  const lastStop = COLOR_STOPS[COLOR_STOPS.length - 1];
  if (elevation >= lastStop.elevation) {
    return lastStop.color;
  }

  let low = COLOR_STOPS[0];
  let high = COLOR_STOPS[1];
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    if (COLOR_STOPS[i].elevation >= elevation) {
      low = COLOR_STOPS[i - 1];
      high = COLOR_STOPS[i];
      break;
    }
  }

  const t = (elevation - low.elevation) / (high.elevation - low.elevation);

  return {
    r: Math.round(low.color.r + t * (high.color.r - low.color.r)),
    g: Math.round(low.color.g + t * (high.color.g - low.color.g)),
    b: Math.round(low.color.b + t * (high.color.b - low.color.b)),
  };
}
