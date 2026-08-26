/** Simple universal recycling symbol — stroke-only, instantly readable */

const ARM =
  'M12 4.2 8.8 10.5H11L9.7 13.4c1.7-.5 3.4-.1 4.7 1L16.5 10.8H18.6L12 4.2z';

function RecycleArms({ color, strokeWidth, fill = 'none' }) {
  const props = {
    fill,
    stroke: fill === 'none' ? color : undefined,
    strokeWidth: fill === 'none' ? strokeWidth : undefined,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  return (
    <>
      <path d={ARM} {...props} />
      <g transform="rotate(120 12 12)">
        <path d={ARM} {...props} />
      </g>
      <g transform="rotate(240 12 12)">
        <path d={ARM} {...props} />
      </g>
    </>
  );
}

export function RecycleSimple({ color = 'currentColor', strokeWidth = 1.65 }) {
  return <RecycleArms color={color} strokeWidth={strokeWidth} />;
}

export function RecycleStroke({ color = 'currentColor', strokeWidth = 1.5 }) {
  return <RecycleArms color={color} strokeWidth={strokeWidth} />;
}
