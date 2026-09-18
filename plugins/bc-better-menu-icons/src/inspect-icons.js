const icons = require('@wordpress/icons');

function renderElement(element) {
  if (!element) return '';
  if (typeof element === 'string') return element;
  if (Array.isArray(element)) return element.map(renderElement).join('');
  if (element.props) {
    const props = { ...element.props };
    const children = props.children;
    delete props.children;
    let tagName = element.type || 'path';
    if (typeof tagName !== 'string') {
      if (props.d !== undefined) tagName = 'path';
      else if (props.cx !== undefined) tagName = 'circle';
      else tagName = 'g';
    }
    const attrs = Object.entries(props)
      .filter(([key, value]) => value !== undefined && key !== 'xmlns' && key !== 'viewBox')
      .map(([key, value]) => {
        const attrName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${attrName}="${value}"`;
      })
      .join(' ');
    const innerContent = renderElement(children);
    if (innerContent) return `<${tagName}${attrs ? ' ' + attrs : ''}>${innerContent}</${tagName}>`;
    return `<${tagName}${attrs ? ' ' + attrs : ''} />`;
  }
  return '';
}

['plus', 'plusCircle', 'plusCircleFilled', 'chevronRight', 'chevronLeft', 'arrowRight', 'arrowLeft'].forEach(name => {
  const icon = icons[name];
  if (icon && icon.props) {
    const viewBox = icon.props.viewBox || '0 0 24 24';
    const inner = renderElement(icon.props.children);
    console.log(`--- ${name} (viewBox: ${viewBox}) ---`);
    console.log(`<svg viewBox="${viewBox}">${inner}</svg>`);
    console.log('');
  }
});
