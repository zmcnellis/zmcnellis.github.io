import React from 'react'
import styled from 'styled-components'
import Zach from '../../img/zmcnellis.jpg'
import { breakpoints, colors } from '../../utils/styles'

const Intro = () => (
  <Wrapper>
    <HeadingRow>
      <Heading>Hey, I’m Zach - A Software Engineer in San Francisco.</Heading>
      <AnimationWrapper>
        <AvatarBlock>
          <Avatar src={Zach} alt='Zachary McNellis' />
        </AvatarBlock>
      </AnimationWrapper>
    </HeadingRow>
    <About>
      I’ve delivered features and launched A/B tests for millions of users at{' '}
      <Link href='https://www.shipt.com'>Shipt</Link>, led the development of
      multiple front-end applications (including the shipt.com marketing site),
      and currently manage a team of front-end engineers.
    </About>
    <Link href='mailto:zacharymcnellis@gmail.com'>
      zacharymcnellis@gmail.com
    </Link>
  </Wrapper>
)

const Wrapper = styled.section`
  margin: 120px auto;
  padding: 0 16px;
  max-width: 1080px;

  ${breakpoints.medium`
    padding: 0 60px;
    margin-top: 220px;
  `};
`

const HeadingRow = styled.div`
  display: flex;
  flex-direction: column-reverse;

  ${breakpoints.medium`
    flex-direction: row;
    align-items: center;
  `};
`

const Heading = styled.h1`
  font-weight: bold;
  font-size: 34px;
  max-width: 460px;
  margin: 0;
`

const AvatarBlock = styled.div`
  width: 74px;
  height: 74px;
  position: relative;
  transition: 800ms all cubic-bezier(0.5, 1, 0.4, 2) 10ms;
  padding-bottom: 12px;

  &::after {
    opacity: 0;
    content: '👋';
    line-height: 74px;
    text-align: center;
    font-size: 36px;
    position: absolute;
    background: ${colors.white};
    width: 74px;
    height: 74px;
    top: 0;
    left: 0;
    border-radius: 100%;
    border: 1px solid ${colors.black};
  }

  ${breakpoints.medium`
    padding-bottom: 0;
  `};
`

const Avatar = styled.img`
  border-radius: 100%;
  width: 74px;
  height: 74px;
`

const AnimationWrapper = styled.div`
  width: 94px;
  height: 94px;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    ${AvatarBlock} {
      transform: rotateY(160deg) scale(1.2);

      &::after {
        opacity: 1;
      }
    }
  }
`

const About = styled.p`
  max-width: 600px;
  font-size: 18px;
  line-height: 28px;
  margin: 24px 0;
`

const Link = styled.a`
  font-size: 18px;
  padding: 0 1px;
  text-decoration: none;
  border-bottom: 1px solid ${colors.black};
  transition: 0.2s ease-out;
  padding-bottom: 3px;
  color: ${colors.black};

  &:hover {
    background-color: ${colors.black};
    color: ${colors.white};
  }
`

export default Intro
