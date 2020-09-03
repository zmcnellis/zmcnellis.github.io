import React from 'react'
import styled from 'styled-components'
import { breakpoints } from '../utils/styles'
import GatsbyLogo from '../img/gatsby.png'
import ReactLogo from '../img/react.png'

const Footer = () => {
  const year = new Date().getFullYear()
  return (
    <Wrapper>
      <Description>
        Made with{' '}
        <a href='https://www.gatsbyjs.com/'>
          <Logo src={GatsbyLogo} alt='Gatsby' />
        </a>{' '}
        and{' '}
        <a href='https://reactjs.org/'>
          <Logo src={ReactLogo} alt='React' />
        </a>{' '}
        — &copy; Copyright {year}, Zachary McNellis
      </Description>
    </Wrapper>
  )
}

const Wrapper = styled.footer`
  display: block;
  padding: 0 16px;
  max-width: 1080px;
  margin: 0 auto 16px;

  ${breakpoints.medium`
    padding: 0 60px;
  `};
`

const Description = styled.p`
  font-size: 14px;
  margin: 0;
  color: #000;
`

const Logo = styled.img`
  height: 14px;
  width: auto;
`

export default Footer
