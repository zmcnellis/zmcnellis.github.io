import { css } from 'styled-components'

const breakpoints = {
  small: (...args) => css`
    @media screen and (max-width: 767px) {
      ${css(...args)};
    }
  `,
  medium: (...args) => css`
    @media screen and (min-width: 768px) {
      ${css(...args)};
    }
  `,
  large: (...args) => css`
    @media screen and (min-width: 1080px) {
      ${css(...args)};
    }
  `,
}

export default breakpoints