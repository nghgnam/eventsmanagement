import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatPhone'
})
export class FormatPhonePipe implements PipeTransform {
  transform(value: string, dialCode: string): string {
    if (!value || !dialCode) return value;

    const clean = value.replace(/\D/g, '');

    if (clean.startsWith(dialCode.replace('+', ''))) {
      return '+' + clean;
    }

    return dialCode + clean;
  }
}
