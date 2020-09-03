import React, { useState } from 'react'
import styled from 'styled-components'
import Marriott360 from '../../img/marriott-360.png'
import DeskCodepen from '../../img/desk-codepen.png'
import SoulsQuickMenu from '../../img/souls-quick-menu.png'
import EulerianFluidSolver from '../../img/eulerian-fluid-solver.png'
import AsteroidsGame from '../../img/asteroids-game.png'
import Coderx from '../../img/coderx.png'
import { breakpoints, colors } from '../../utils/styles'
import ProjectModal from './modals/index'
import MarriottModal from './modals/marriott'
import CodepenModal from './modals/codepen'
import SkyrimModal from './modals/skyrim'
import CatModal from './modals/cat'
import AsteroidsModal from './modals/asteroids'
import CoderxModal from './modals/coderx'

const data = [
  {
    name: 'Marriott 360° AR Experience',
    image: Marriott360,
    Modal: MarriottModal
  },
  {
    name: 'CodePen Desk Scene',
    image: DeskCodepen,
    Modal: CodepenModal
  },
  {
    name: 'Skyrim Dark Souls Mod',
    image: SoulsQuickMenu,
    Modal: SkyrimModal
  },
  {
    name: 'Real-time 2D Eulerian Fluid Solver',
    image: EulerianFluidSolver,
    Modal: CatModal
  },
  {
    name: 'Asteroids Game with Real-time Fluid Simulation',
    image: AsteroidsGame,
    Modal: AsteroidsModal
  },
  {
    name: 'Code℞',
    image: Coderx,
    Modal: CoderxModal
  }
]

const Projects = () => {
  const [visibleModal, setVisibleModal] = useState(null)

  return (
    <Wrapper>
      <Heading>Featured projects.</Heading>
      <Description>
        A collection of small side projects I've done outside of work for fun.
      </Description>
      <Grid>
        {data.map((project, index) => (
          <ProjectWrapper
            key={index}
            index={index}
            onClick={() => setVisibleModal(project)}
          >
            {project.image && <Image src={project.image} alt={project.name} />}
            <Name>{project.name}</Name>
            <Overlay />
          </ProjectWrapper>
        ))}
      </Grid>
      <ProjectModal
        isOpen={!!visibleModal}
        onRequestClose={() => setVisibleModal(null)}
        name={visibleModal && visibleModal.name}
        image={visibleModal && visibleModal.image}
      >
        {visibleModal && visibleModal.Modal && <visibleModal.Modal />}
      </ProjectModal>
    </Wrapper>
  )
}

const Wrapper = styled.section`
  margin: 120px auto 24px;
  padding: 0 16px;
  max-width: 1080px;

  ${breakpoints.medium`
    padding: 0 60px;
    margin-top: 160px;
    margin-bottom: 60px;
  `};
`

const Heading = styled.h2`
  font-weight: bold;
  font-size: 34px;
  max-width: 460px;
  margin: 0 0 12px;
`

const Description = styled.p`
  max-width: 600px;
  font-size: 18px;
  line-height: 28px;
  margin: 24px 0;
`

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const Name = styled.span`
  transition: 0.4s ease;
  color: ${colors.gray};
  font-weight: 500;
  font-size: 18px;
  padding: 24px;
  position: absolute;
  left: 0;
  top: 0;
  text-align: left;
  opacity: 0;
  z-index: 2;

  ${breakpoints.medium`
    font-size: 24px;
  `};
`

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  object-fit: contain;
`

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  transition: 0.4s ease;
  opacity: 0;
  z-index: 1;
`

const ProjectWrapper = styled.button`
  width: 100%;
  background: ${colors.gray};
  height: 425px;
  margin-top: 20px;
  transition: 0.4s ease;
  cursor: pointer;
  outline: none;
  border: none;
  position: relative;

  &:hover {
    background: #0fa5;

    ${Name} {
      color: ${colors.white};
      opacity: 1;
    }

    ${Overlay} {
      opacity: 1;
    }
  }

  ${breakpoints.medium`
    width: calc(50% - 10px);
    margin-left: ${({ index }) => (index % 2 ? '10px' : 0)};
    margin-right: ${({ index }) => (index % 2 ? 0 : '10px')};
  `};
`

export default Projects
