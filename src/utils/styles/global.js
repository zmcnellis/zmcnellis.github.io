import { createGlobalStyle } from 'styled-components'
import CircularStdBook from '../../fonts/CircularStd-Book.woff'
import CircularStdBlack from '../../fonts/CircularStd-Black.woff'
import CircularStdMedium from '../../fonts/CircularStd-Medium.woff'
import { fonts as fontNames, colors } from '../styles'

const fonts = `
  @font-face {
    font-family: ${fontNames.circular};
    src: url(${CircularStdBook}) format("woff");
    font-style: normal;
    font-weight: normal;
    font-display: fallback;
  }
  
  @font-face {
    font-family: ${fontNames.circular};
    src: url(${CircularStdMedium}) format("woff");
    font-style: normal;
    font-weight: 500;
    font-display: fallback;
  }
  
  @font-face {
    font-family: ${fontNames.circular};
    src: url(${CircularStdBlack}) format("woff");
    font-style: normal;
    font-weight: bold;
    font-display: fallback;
  }
`

const base = `
  body {
    font-family: ${fontNames.circular};
    color: ${colors.text};
    margin: 0;
  }

  ::-moz-selection { /* Code for Firefox */
    color: ${colors.white};
    background: ${colors.green};
  }
  
  ::selection {
    color: ${colors.white};
    background: ${colors.green};
  }

  // Focus Outline Styles
  a,
  button,
  input,
  textarea,
  select,
  [tabindex='0'] {
    &:focus {
      /* Default */
      outline-color: black;
      outline-style: dashed;
      outline-width: 1px;
      outline-offset: 2px;
      /* Outline Radius - Mozilla Only */
      -moz-outline-radius: 4px;
    }
  }
  
  body:not(.keyboardUser) :focus {
    outline: none;
  }
`

const GlobalStyles = createGlobalStyle`
  ${fonts}
  ${base}
`

export default GlobalStyles