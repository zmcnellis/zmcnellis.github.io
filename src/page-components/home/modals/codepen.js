import React from 'react'
import styled from 'styled-components'
import Button from '../../../components/button'

const Codepen = () => (
  <div>
    <p>
      This is just a fun CSS animation I chose to do after being inspired by
      various posts on Codepen. It is meant to look like my desk and features a
      flickering lamp, steaming coffee, and an alarm clock. Everything is done with
      pure HTML/CSS except for a small snippet of JS to get the current time for
      the clock. You can check out the code and live version below.
    </p>
    <Row>
      <Button
        text='codepen'
        href='https://codepen.io/zmcnellis/full/ybobjB'
        target='_blank'
      />
    </Row>
  </div>
)

const Row = styled.div`
  display: flex;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export default Codepen
