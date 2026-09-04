import React from 'react'
import { createRenderer } from 'react-shallow-renderer';
import Link, { LinkProps } from './Link'

const setup = (propOverrides?:Partial<LinkProps>) => {
  const props:LinkProps= Object.assign({
    active: false,
    children: 'All',
    setFilter: vi.fn()
  }, propOverrides)

  const renderer = createRenderer();
  renderer.render(<Link {...props} />)
  const output = renderer.getRenderOutput()

  return {
    props: props,
    output: output,
  }
}

describe('component', () => {
  describe('Link', () => {
    it('should render correctly', () => {
      const { output } = setup()
      expect(output.type).toBe('a')
      expect(output.props.style.cursor).toBe('pointer')
      expect(output.props.children).toBe('All')
    })

    it('should have class selected if active', () => {
      const { output } = setup({ active: true })
      expect(output.props.className).toBe('selected')
    })

    it('should call setFilter on click', () => {
      const { output, props } = setup()
      output.props.onClick()
      expect(props.setFilter).toBeCalled()
    })
  })
})
