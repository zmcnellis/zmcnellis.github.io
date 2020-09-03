import React from 'react'
import styled from 'styled-components'
import Layout from '../components/layout'
import { breakpoints, colors } from '../utils/styles'

const NotFound = () => (
  <Layout>
    <Wrapper>
      <Heading>Whoopsie.</Heading>
      <Description>
        Looks like the page you’re searching for does not exist. Try navigating
        to the <Link href='/'>home page</Link>.
      </Description>
    </Wrapper>
  </Layout>
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

const Heading = styled.h1`
  font-weight: bold;
  font-size: 34px;
  max-width: 460px;
  margin: 0;
`

const Description = styled.p`
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

export default NotFound
