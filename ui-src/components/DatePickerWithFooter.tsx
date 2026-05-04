import { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';

interface DatePickerWithFooterProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  dateFormat?: string;
}

export const DatePickerWithFooter = forwardRef<HTMLInputElement, DatePickerWithFooterProps>(
  ({ selected, onChange, className, dateFormat = 'yyyy-MM-dd' }, ref) => {
    return (
      <DatePicker
        ref={ref}
        selected={selected}
        onChange={onChange}
        className={className}
        dateFormat={dateFormat}
        monthsShown={2}
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        popperPlacement="bottom-start"
        popperModifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ]}
      />
    );
  }
);

DatePickerWithFooter.displayName = 'DatePickerWithFooter';