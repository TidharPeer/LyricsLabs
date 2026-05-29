export const colors = {
  gray: {
    '00': 'rgb(255, 255, 255)',
    '01': 'rgb(250, 250, 250)',
    '02': 'rgb(244, 244, 245)',
    '03': 'rgb(228, 228, 231)',
    '04': 'rgb(212, 212, 216)',
    '05': 'rgb(161, 161, 170)',
    '06': 'rgb(113, 113, 122)',
    '07': 'rgb(82, 82, 91)',
    '08': 'rgb(63, 63, 70)',
    '09': 'rgb(39, 39, 42)',
    '10': 'rgb(9, 9, 11)',
  },
  red: {
    '50':  'rgb(254, 242, 242)',
    '100': 'rgb(254, 226, 226)',
    '200': 'rgb(254, 202, 202)',
    '300': 'rgb(252, 165, 165)',
    '400': 'rgb(248, 113, 113)',
    '500': 'rgb(239, 68, 68)',
    '600': 'rgb(220, 38, 38)',
    '700': 'rgb(185, 28, 28)',
    '800': 'rgb(153, 27, 27)',
    '900': 'rgb(127, 29, 29)',
    '950': 'rgb(69, 10, 10)',
  },
}

export const lightTheme = {
  mode: 'light' as const,
  colors,
}

export const darkTheme = {
  mode: 'dark' as const,
  colors,
}

export type AppTheme = {
  mode: 'light' | 'dark'
  colors: typeof colors
}
