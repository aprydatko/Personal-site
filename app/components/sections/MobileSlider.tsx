'use client';

import { cn } from '@/app/lib/utils';
import { Children, type ReactNode } from 'react';
import 'swiper/css';
import 'swiper/css/pagination';
import { A11y, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

type MobileSliderProps = {
  children: ReactNode;
  className?: string;
  slideClassName?: string;
};

export const MobileSlider = ({ children, className, slideClassName }: MobileSliderProps) => (
  <Swiper
    className={cn(
      '!-mx-6 !w-[calc(100%+3rem)] pb-1 [&_.swiper-pagination]:!relative [&_.swiper-pagination]:!bottom-auto [&_.swiper-pagination]:mt-7 md:!hidden',
      className,
    )}
    modules={[A11y, Pagination]}
    a11y={{
      containerMessage: 'Featured projects carousel',
      itemRoleDescriptionMessage: 'project',
      paginationBulletMessage: 'Show project {{index}}',
    }}
    pagination={{ clickable: true }}
    slidesOffsetAfter={24}
    slidesOffsetBefore={24}
    slidesPerView={1.12}
    spaceBetween={20}
    breakpoints={{
      640: { slidesPerView: 1.65, spaceBetween: 28 },
    }}
  >
    {Children.map(children, (child) => (
      <SwiperSlide className={cn('!h-auto', slideClassName)}>{child}</SwiperSlide>
    ))}
  </Swiper>
);
