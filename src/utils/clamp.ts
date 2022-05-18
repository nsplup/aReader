"use strict";

export function clamp (val: number, min: number, max: number): number {
  return Math.min(max, Math.max(val, min))
}