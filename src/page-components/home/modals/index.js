import React from 'react'
import styled from 'styled-components'
import Modal from '../../../components/modal'
import { colors } from '../../../utils/styles'

const customContentStyles = `
  padding: 0 !important;
  max-width: 800px;
  max-height: 500px;
  overflow: auto;
`

const ProjectModal = ({
  isOpen = false,
  onRequestClose,
  name,
  image,
  children
}) => {
  return (
    <Modal
      isOpen={isOpen}
      contentLabel={name}
      className='project-modal'
      onRequestClose={onRequestClose}
      customContentStyles={customContentStyles}
      closeIconColor='#fff'
    >
      <Wrapper>
        <Image src={image} alt={name} />
        <Bottom>
          <Heading>{name}</Heading>
          {children}
        </Bottom>
      </Wrapper>
    </Modal>
  )
}

const Wrapper = styled.div`
  width: 100%;
`

const Bottom = styled.div`
  margin: 0 24px;
  text-align: left;
`

const Image = styled.img`
  background-color: ${colors.gray};
  width: 100%;
  height: 300px;
  object-fit: contain;
`

const Heading = styled.h3`
  font-size: 24px;
`

export default ProjectModal
