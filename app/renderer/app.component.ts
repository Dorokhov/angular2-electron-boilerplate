import { Component } from '@angular/core';

@Component({
  selector: 'my-app',
  template: '<h1>Angular 2 : "Hi ' + global.os.type() + ' ' + global.os.release() + '!"</h1>'
})
export class AppComponent { }