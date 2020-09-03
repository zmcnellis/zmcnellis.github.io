import React from 'react'
import styled from 'styled-components'
import Button from '../../../components/button'

const Cat = () => (
  <div>
    <p>
      Fluid simulation is one of the most challenging, "unsolvable", and
      computationally expensive fields in computer graphics. In this project, I
      wanted to test out the performance of a real-time 2D Eulerian Fluid solver
      using plain HTML and JavaScript.
    </p>
    <Row>
      <Button text='project' href='/projects/cfd/index.html' target='_blank' />
      <Button text='code' href='https://github.com/zmcnellis/zmcnellis.github.io/tree/master/projects/cfd' target='_blank' />
    </Row>
  </div>
)

const Row = styled.div`
  display: flex;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export default Cat
