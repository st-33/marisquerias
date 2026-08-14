export class EscPosBuilder {
  init() {
    return this;
  }

  codePage(_cp: number) {
    return this;
  }

  fontNormal() {
    return this;
  }

  align(_align: 'left' | 'center' | 'right') {
    return this;
  }

  bold(_on: boolean) {
    return this;
  }

  text(_value: string) {
    return this;
  }

  lf(_lines: number = 1) {
    return this;
  }

  cut(_partial: boolean = true) {
    return this;
  }

  build() {
    return '';
  }
}
