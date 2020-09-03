import React from 'react'
import styled from 'styled-components'
import { colors } from '../utils/styles'

const Button = ({ text, href, onClick, ...props }) => (
  <StyledButton
    as={href ? 'a' : 'button'}
    href={href}
    onClick={onClick}
    ariaLabel={text}
    {...props}
  >
    {text}
  </StyledButton>
)

const StyledButton = styled.button`
  outline: none;
  border: 1px solid ${colors.black};
  background: ${colors.white};
  width: 100%;
  color: ${colors.black};
  text-decoration: none;
  margin: 4px 0;
  text-align: center;

  &:hover {
    background: ${colors.black};
    color: ${colors.white};
  }
`

export default Button
