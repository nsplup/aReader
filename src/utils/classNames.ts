"use strict";

export function classNames(...classes: any): string {
  return [...new Set(
    classes
      .flat(Infinity)
      .filter((item: any) => item)
      .map((item: any) => (
        typeof item === 'object'
          ? Object.entries(item)
            .filter(([key, val]) => val)
            .map(([key, val]) => key)
          : item
      ))
      .flat(Infinity)
  )].join(' ')
}