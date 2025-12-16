import { clickStyleguide, DefaultThemes, buildTheme } from '@make-software/csprclick-ui';

// Create a withMedia function for responsive styles
const withMedia = (styles: any) => {
  const breakpoints = ['768px', '1024px'];
  
  // Handle array-based responsive properties
  const responsiveStyles: any = { ...styles };
  Object.keys(styles).forEach(key => {
    if (Array.isArray(styles[key])) {
      responsiveStyles[key] = styles[key][0];
      if (styles[key][1]) {
        responsiveStyles[`@media (min-width: ${breakpoints[0]})`] = {
          ...responsiveStyles[`@media (min-width: ${breakpoints[0]})`],
          [key]: styles[key][1]
        };
      }
      if (styles[key][2]) {
        responsiveStyles[`@media (min-width: ${breakpoints[1]})`] = {
          ...responsiveStyles[`@media (min-width: ${breakpoints[1]})`],
          [key]: styles[key][2]
        };
      }
    }
  });
  
  return responsiveStyles;
};

const baseTheme = buildTheme({
  ...DefaultThemes.csprclick,
  appDarkTheme: {
    topBarSectionBackgroundColor:
      DefaultThemes.csprclick.csprclickDarkTheme[clickStyleguide.backgroundTopBarColor],
    [clickStyleguide.textColor]: '#DADCE5',
    bodyBackgroundColor: '#0f1429'
  },
  appLightTheme: {
    topBarSectionBackgroundColor:
      DefaultThemes.csprclick.csprclickLightTheme[clickStyleguide.backgroundTopBarColor],
    [clickStyleguide.textColor]: '#1A1919',
    bodyBackgroundColor: '#f2f3f5'
  }
});

// Add withMedia function to each theme mode
export const AppTheme = {
  light: {
    ...baseTheme.light,
    withMedia,
    styleguideColors: {
      ...baseTheme.light.styleguideColors,
      fillSecondary: baseTheme.light.styleguideColors.fillSecondary || '#666'
    }
  },
  dark: {
    ...baseTheme.dark,
    withMedia,
    styleguideColors: {
      ...baseTheme.dark.styleguideColors,
      fillSecondary: baseTheme.dark.styleguideColors.fillSecondary || '#A8ADBF'
    }
  }
};
