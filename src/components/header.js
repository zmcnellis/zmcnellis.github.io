import React from 'react'
import styled from 'styled-components'
import MobileMenu from './mobileMenu'
import { breakpoints, colors, fonts } from '../utils/styles'
import { useMobileOnly } from '../utils/hooks'

const randomColor = () =>
  `#${Math.floor(Math.random() * 16777215).toString(16)}`

const Header = ({ showMobileMenu, onMobileMenuClick }) => {
  const name = 'zachary mcnellis'
  const isMobile = useMobileOnly()

  return (
    <Wrapper>
      <Nav>
        <LeftSection>
          <Name href='.' showMobileMenu={showMobileMenu}>
            {name.split('').map((letter, index) => {
              if (letter === ' ') return <span key={index}>&nbsp;</span>
              return (
                <Letter key={index} color={randomColor()}>
                  {letter}
                </Letter>
              )
            })}
          </Name>
          {!isMobile && (
            <LeftLinks>
              <Link href='https://github.com/zmcnellis'>github</Link>
              <Link href='https://www.linkedin.com/in/zachary-mcnellis-0526575a'>
                linkedin
              </Link>
              <Link href='/resume.pdf'>résumé</Link>
            </LeftLinks>
          )}
        </LeftSection>
        <RightLinks>
          {(isMobile || showMobileMenu) ? (
            <MobileMenu
              showMobileMenu={showMobileMenu}
              onMobileMenuClick={onMobileMenuClick}
            />
          ) : (
            <RightButton href='mailto:zacharymcnellis@gmail.com'>
              contact
            </RightButton>
          )}
        </RightLinks>
      </Nav>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  width: 100%;
  border-bottom: 1px solid ${colors.black};
  position: fixed;
  z-index: 2;
  height: 60px;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${colors.white};
`

const Nav = styled.nav`
  display: flex;
  max-width: 1080px;
  margin: 0 auto;
  align-items: center;
  padding: 0 16px;
  justify-content: flex-start;
  height: 100%;

  ${breakpoints.medium`
    padding: 0 60px;
  `};
`

const LeftSection = styled.div`
  display: flex;
  width: 50%;
`

const Name = styled.a`
  display: block;
  font-weight: bold;
  width: 130px;
  text-decoration: none;
  color: ${({ showMobileMenu }) => showMobileMenu ? colors.white : colors.black};
  z-index: 20;
`

const LeftLinks = styled.div`
  padding-left: 20px;
`

const RightLinks = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 50%;
  background: #fff;
`

const RightButton = styled.a`
  display: block;
  text-decoration: none;
  color: ${colors.green};
  border: 2px solid ${colors.green};
  box-shadow: 4px 4px 1px ${colors.green};
  padding: 4px 16px;
  outline: 1px solid transparent;
  transition: box-shadow 0.1s ease-out;
  font-family: ${fonts.circular};
  font-size: 16px;
  cursor: pointer;

  &:hover {
    box-shadow: 0 0 0 0 ${colors.green};
  }
`

const Link = styled.a`
  text-decoration: none;
  color: ${colors.black};
  padding: 0 20px;

  &:hover {
    background-color: ${colors.black};
    color: ${colors.white};
  }
`

const Letter = styled.span`
  display: inline-block;
  transition: 800ms all cubic-bezier(0.5, 1, 0.4, 2);

  &:hover {
    transform: rotateY(160deg) rotateX(-20deg) scale(1.2);
    color: ${({ color }) => color};
  }
`

export default Header
