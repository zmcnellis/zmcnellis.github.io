import React from 'react'
import ReactModal from 'react-modal'
import styled from 'styled-components'
import CloseIcon from './icons/close'

if (typeof document !== 'undefined' && document.querySelector('#___gatsby')) {
  ReactModal.setAppElement('#___gatsby')
}

const modalAnimationSpeed = 366

const ModalAdapter = ({
  isOpen,
  className,
  contentLabel,
  children,
  customCloseIconStyles,
  closeIconColor,
  ...restProps
}) => {
  const contentClassName = `${className}__content`
  const overlayClassName = `${className}__overlay`
  const bodyOpenClassName = `${className}__bodyOpen`

  return (
    <ReactModal
      isOpen={isOpen}
      contentLabel={contentLabel}
      className={contentClassName}
      bodyOpenClassName={bodyOpenClassName}
      overlayClassName={overlayClassName}
      closeTimeoutMS={modalAnimationSpeed}
      {...restProps}
    >
      <CloseIconWrapper
        aria-label="close"
        onClick={restProps.onRequestClose}
        customCloseIconStyles={customCloseIconStyles}
      >
        <CloseIcon color={closeIconColor} />
      </CloseIconWrapper>
      <ModalBody>{children}</ModalBody>
    </ReactModal>
  )
}

const ModalCustomStyleAdapter = ({
  customOverlayStyles,
  customContentStyles,
  ...props
}) => <ModalAdapter {...props} />

const ModalContainer = styled(ModalCustomStyleAdapter)`
  &.ReactModal__Overlay {
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    background-color: rgba(30, 30, 30, 0.7);
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity ${modalAnimationSpeed}ms ease-in-out;
    padding: 6px;
    ${({ customOverlayStyles }) => customOverlayStyles};
  }

  .ReactModal__Overlay--after-open {
    opacity: 1;
  }

  .ReactModal__Overlay--before-close {
    opacity: 0;
  }

  &.ReactModal__Content {
    position: relative;
    background: #fff;
    max-width: 600px;
    padding: 48px 64px !important;
    width: 100%;

    @media screen and (max-width: 325px) {
      padding: 25px;
    }

    ${({ customContentStyles }) => customContentStyles};
  }

  &.ReactModal__BodyOpen {
    overflow: hidden;
  }
`

const ModalBody = styled.div`
  width: 100%;
  height: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const CloseIconWrapper = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  cursor: pointer;
  padding: 20px;
  background: none;
  border: none;

  ${({ customCloseIconStyles }) => customCloseIconStyles};
`

export default ModalContainer