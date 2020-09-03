import React from 'react'
import styled from 'styled-components'
import { colors, breakpoints } from '../utils/styles'

const MobileMenu = ({ showMobileMenu, onMobileMenuClick }) => (
  <React.Fragment>
    <MenuToggle
      aria-label='menu - show more content'
      onClick={onMobileMenuClick}
    >
      {[...Array(3)].map((_, index) => (
        <Line key={index} showMobileMenu={showMobileMenu} />
      ))}
    </MenuToggle>

    <Overlay showMobileMenu={showMobileMenu}>
      <NavLink href='https://github.com/zmcnellis'>github</NavLink>
      <NavLink href='https://www.linkedin.com/in/zachary-mcnellis-0526575a'>linkedin</NavLink>
      <NavLink href='/resume.pdf'>résumé</NavLink>
      <NavLink href='mailto:zacharymcnellis@gmail.com'>email</NavLink>
    </Overlay>
  </React.Fragment>
)

const MenuToggle = styled.button`
  z-index: 3;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 100%;
  outline: none;
  border: none;
  background: none;

  ${breakpoints.medium`
    display: none;
  `};
`

const Line = styled.div`
  height: 4px;
  margin-bottom: 6px;
  width: 32px;
  background-color: ${colors.black};
  transition: all 0.3s ease-in-out;

  ${({ showMobileMenu }) =>
    showMobileMenu &&
    `
    background-color: #fff;

    &:nth-child(1) {
      transform: translateY(10px) rotate(45deg);
    }

    &:nth-child(3) {
      transform: translateY(-10px) rotate(-45deg);
    }
  `};

  &:nth-child(2) {
    opacity: 0;
  }
`

const NavLink = styled.a`
  display: block;
  width: 100%;
  margin-bottom: 32px;
  color: #fff;
  background: ${colors.black};
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1.8px;
  line-height: 32px;
  text-align: center;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    color: #fff;
  }
`

const Overlay = styled.div`
  transition: opacity 0.3s ease-in-out;
  z-index: 2;
  position: fixed;
  background: ${colors.black};
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  opacity: 0;
  visibility: hidden;
  justify-content: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  -webkit-box-pack: center;
  -webkit-box-align: center;

  ${({ showMobileMenu }) =>
    showMobileMenu &&
    `
    opacity: 1;
    visibility: visible;
  `};
`

export default MobileMenu
