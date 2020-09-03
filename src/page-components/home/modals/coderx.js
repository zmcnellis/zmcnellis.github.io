import React from 'react'
import styled from 'styled-components'
import Button from '../../../components/button'

const Coderx = () => (
  <div>
    <p>
      One of the deliverables for my Master's thesis was an online application
      that anyone can use to solve challenging programming problems with the
      intent of teaching beginners to code. You can use C++ or Python to solve
      the questions which will give you a report of different code metrics to
      measure software quality.
    </p>
    <Row>
      <Button text='project' href='https://coderx.herokuapp.com' target='_blank' />
      <Button text='thesis' href='http://tigerprints.clemson.edu/cgi/viewcontent.cgi?article=3346&context=all_theses' target='_blank' />
      <Button text='presentation' href='https://zmcnellis.github.io/projects/thesis/presentation.pdf' target='_blank' />
    </Row>
  </div>
)

const Row = styled.div`
  display: flex;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export default Coderx
