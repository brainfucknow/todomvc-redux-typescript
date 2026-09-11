import React from 'react'
import classnames from 'classnames'

const Link: React.FunctionComponent<LinkProps> = ({
  active,
  children,
  setFilter,
}: LinkProps) => (
  // A real href or a <button> would change the rendered element and its keyboard behavior.
  // eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <a
    className={classnames({ selected: active })}
    style={{ cursor: 'pointer' }}
    onClick={() => setFilter()}
  >
    {children}
  </a>
)

export interface LinkProps {
  active: boolean
  children: string
  setFilter: { (): void }
}

export default Link
