import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelectField, TextArea, TextField } from './Field';

describe('form fields', () => {
  it('label their controls and link errors for assistive tech', () => {
    render(
      <>
        <TextField label="Email" error="Enter a valid email address." />
        <TextArea label="Description" hint="Optional" />
        <SelectField label="Assignee">
          <option>Unassigned</option>
        </SelectField>
      </>,
    );
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter a valid email address.');
    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription('Optional');
    expect(screen.getByLabelText('Assignee').tagName).toBe('SELECT');
  });
});
