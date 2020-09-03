import React from 'react'
import styled from 'styled-components'
import Button from '../../../components/button'

const Marriott = () => (
  <div>
    <p>
      I worked with Marriott in 2019 to create an augmented reality experience
      for a conference they were hosting. The project was to develop a mobile
      friendly site where users can view 360-degree panoramic photos of various
      rooms in a hotel. These photos can then be viewed through a VR headset
      such as Google Cardboard or Oculus.
    </p>
    <p>
      I used React to build the front-end and hosted it through Zeit as I needed
      to be able to scale up the application quickly (there were up to 1,000
      active users accessing the VR experience at the same time). There was some
      backend work that I implemented with Firebase, as well as some Google
      Analytics tracking. The WebVR technology is built with AFrame which is an
      open-source, cross-platform web VR framework.
    </p>
    <p>
      The site was initially built for Courtyard only, but later I was asked to
      build out separate environments for SpringHill Suites, Four Points, and
      Fairfield due to the success of the project.
    </p>
    <Row>
      <Button text='code' href='https://github.com/zmcnellis/courtyard-vr' target='_blank' />
      <Button text='link 1' href='https://guestexp360.com/shs' target='_blank' />
      <Button text='link 2' href='https://guestexp360.com/fp' target='_blank' />
      <Button text='link 3' href='https://guestexp360.com/ff' target='_blank' />
      <Button text='link 4' href='https://guestexp360.com/cy' target='_blank' />
    </Row>
  </div>
)

const Row = styled.div`
  display: flex;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export default Marriott
