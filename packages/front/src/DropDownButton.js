import './DropDownButton.css'
import SpinnerButton from './SpinnerButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as R from 'ramda'
import React from 'react'
import DropDown from './DropDown'

const DropDownButton = props => {
  const {
    className,
    buttonClassName,
    icon,
    popupAbove,
    label,
    loading = false,
    loadingLabel,
    disabled = false,
    children,
    size = 'small',
    style,
    onClick,
    popupClassName,
    popupStyle,
    ...rest
  } = props

  return (
    <span className={`popup_container ${className || ''}`} style={{ display: 'flex' }}>
      <SpinnerButton
        className={`button-drop_down-left ${buttonClassName}`}
        {...{ loading, loadingLabel, disabled, size, style, onClick }}
        {...rest}
      >
        <span className="button-push_button_icon">
          <FontAwesomeIcon icon={icon} />
        </span>{' '}
        <span className={'button-push_button_label'}>{label}</span>
      </SpinnerButton>
      <DropDown
        disabled={disabled}
        anchor={
          <button
            disabled={disabled || loading}
            className={`button button-push_button button-push_button-${size} button-push_button-primary button-drop_down-right`}
            style={{
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FontAwesomeIcon icon="caret-down" />
          </button>
        }
        style={{ position: 'static' }}
        popupStyle={{ ...popupStyle }}
        popupClassName={popupClassName}
      >
        {children}
      </DropDown>
    </span>
  )
}

export default DropDownButton
