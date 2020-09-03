import React from 'react'
import styled from 'styled-components'
import Button from '../../../components/button'

const Asteroids = () => (
  <div>
    <p>
      Fluid simulation is one of the most challenging, "unsolvable", and
      computationally expensive fields in computer graphics. In this project, I
      wanted to incorporate various real-time fluid simulation methods into a
      cool and fun game! The project was coded in C++ and Glut.
    </p>
    <Row>
      <Button text='video' href='/projects/fluidSimulation/asteroids.mp4' target='_blank' />
      <Button text='code' href='#' target='_blank' />
    </Row>
  </div>
)

const Row = styled.div`
  display: flex;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export default Asteroids
