'use client';

import { cn } from '@/app/lib/utils';
import { Children, type ReactNode } from 'react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

type MobileSliderProps = {
  children: ReactNode;
  className?: string;
  slideClassName?: string;
};

export const MobileSlider = ({ children, className, slideClassName }: MobileSliderProps) => (
  <Swiper
    className={cn(
      '!-mx-6 !w-[calc(100%+3rem)] pb-1 [&_.swiper-pagination]:!relative [&_.swiper-pagination]:!bottom-auto [&_.swiper-pagination]:mt-7 [&_.swiper-pagination-bullet]:!mx-1.5 [&_.swiper-pagination-bullet]:!size-1.5 [&_.swiper-pagination-bullet]:!bg-muted [&_.swiper-pagination-bullet-active]:!bg-foreground md:!hidden',
      className
    )}
    modules={[Pagination]}
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
