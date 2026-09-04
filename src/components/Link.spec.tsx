import { screen } from '@testing-library/react'
import Link, { LinkProps } from './Link'
import { rootOf } from '../test-queries'
import { renderComponent } from '../test-render'

const renderLink = (propOverrides?: Partial<LinkProps>) => {
  const props: LinkProps = {
    active: false,
    children: 'All',
    setFilter: vi.fn(),
    ...propOverrides,
  }
  const rendered = renderComponent(<Link {...props} />)
  return { props, anchor: rootOf(rendered), ...rendered }
}

describe('Link', () => {
  it('C12 renders an anchor showing the label, with a pointer cursor', () => {
    const { anchor } = renderLink()
    expect(anchor.tagName).toBe('A')
    expect(anchor.textContent).toBe('All')
    expect(anchor.style.cursor).toBe('pointer')
  })

  it('C13 carries class selected when it is the active filter', () => {
    const { anchor } = renderLink({ active: true })
    expect(anchor.className).toBe('selected')
  })

  it('C14 calls setFilter when clicked', async () => {
    const { props, user } = renderLink()
    await user.click(screen.getByText('All'))
    expect(props.setFilter).toHaveBeenCalledTimes(1)
  })
})
