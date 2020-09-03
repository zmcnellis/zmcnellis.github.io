import React from 'react'
import styled from 'styled-components'
import Button from '../../../components/button'

const Skyrim = () => (
  <div>
    <p>
      I worked with a friend of mine to build a Skyrim Mod called "Souls Quick
      Menu". We published it to the Nexus Mods website and it has since received
      over 100,000 downloads.
    </p>
    <p>
      The majority of the code for this mod is written in Papyrus, which is a
      scripting language developed specifically for the Creation Engine that
      Skyrim and Fallout 4 run on. The UI work for the mod was done by me in
      Adobe Flash, which also required some scripting using ActionScript.
    </p>
    <Row>
      <Button
        text='Nexus Mods'
        href='https://www.nexusmods.com/skyrim/mods/72238'
        target='_blank'
      />
      <Button
        text='code'
        href='https://github.com/ChristianWeeks/Souls_Quick_Menu'
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

export default Skyrim
