import { render, fireEvent } from '@testing-library/react'
import Link, { LinkProps } from './Link'

const setup = (propOverrides?: Partial<LinkProps>) => {
  const props: LinkProps = Object.assign(
    {
      active: false,
      children: 'All',
      setFilter: vi.fn(),
    },
    propOverrides,
  )

  const { container } = render(<Link {...props} />)
  const link = container.querySelector('a') as HTMLAnchorElement

  return {
    props: props,
    link: link,
  }
}

describe('component', () => {
  describe('Link', () => {
    it('should render correctly', () => {
      const { link } = setup()
      expect(link).not.toBeNull()
      expect(link.style.cursor).toBe('pointer')
      expect(link.textContent).toBe('All')
    })

    it('should have class selected if active', () => {
      const { link } = setup({ active: true })
      expect(link.className).toBe('selected')
    })

    it('should call setFilter on click', () => {
      const { link, props } = setup()
      fireEvent.click(link)
      expect(props.setFilter).toBeCalled()
    })
  })
})
