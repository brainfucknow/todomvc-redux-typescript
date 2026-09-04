import React from 'react'
import classnames from 'classnames'

const Link: React.FunctionComponent<LinkProps> = ({
  active,
  children,
  setFilter,
}: LinkProps) => (
  // The filter links are anchors with a click handler and no href. Making
  // this valid - a real href, or a <button> - changes the rendered element
  // and its keyboard behavior, which task 06 puts out of scope.
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
