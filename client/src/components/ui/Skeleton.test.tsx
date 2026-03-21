import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonRing, SkeletonCard } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toBeInTheDocument();
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('16px');
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="32px" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('32px');
  });

  it('applies custom radius', () => {
    const { container } = render(<Skeleton radius="8px" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.borderRadius).toBe('8px');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="my-custom-class" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el.classList.contains('my-custom-class')).toBe(true);
  });
});

describe('SkeletonRing', () => {
  it('renders circular element', () => {
    const { container } = render(<SkeletonRing />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toBeInTheDocument();
    expect(el.classList.contains('ring')).toBe(true);
  });
});

describe('SkeletonCard', () => {
  it('renders default 3 skeleton lines', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.skeleton');

    expect(skeletons.length).toBe(3);
  });

  it('renders specified number of skeleton lines', () => {
    const { container } = render(<SkeletonCard lines={5} />);
    const skeletons = container.querySelectorAll('.skeleton');

    expect(skeletons.length).toBe(5);
  });

  it('last skeleton line has 60% width', () => {
    const { container } = render(<SkeletonCard lines={3} />);
    const skeletons = container.querySelectorAll('.skeleton');
    const lastSkeleton = skeletons[skeletons.length - 1] as HTMLElement;

    expect(lastSkeleton.style.width).toBe('60%');
  });
});
