# Third-party notices

This product is proprietary (see [LICENSE](LICENSE)), but it is built on
open-source components. Those components keep their own licences, and those
licences apply regardless of how this product is licensed or sold.

Two obligations survive here and are met by this file:

- **MIT** requires the copyright notice and permission notice to be included
  in all copies or substantial portions of the software.
- **Apache-2.0** (PDF.js) additionally requires that recipients be given a copy
  of the licence and that attribution notices are retained.

Both apply to the bundled JavaScript we ship, so this file is distributed with
the application and linked from the site.

---

## PDF.js — `pdfjs-dist` 6.2.108

Licensed under the Apache License, Version 2.0.

> Copyright Mozilla Foundation and contributors
>
> Licensed under the Apache License, Version 2.0 (the "License"); you may not
> use this file except in compliance with the License. You may obtain a copy of
> the License at
>
> http://www.apache.org/licenses/LICENSE-2.0
>
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
> WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
> License for the specific language governing permissions and limitations under
> the License.

Used for rendering PDF pages to a canvas and for reading the text and image
placement of a page. Source: https://github.com/mozilla/pdf.js

---

## MIT-licensed components

The following are used under the MIT License. The MIT permission notice is
reproduced once below and applies to each of them.

| Component | Version | Copyright |
|---|---|---|
| `pdf-lib` | 1.17.1 | Copyright (c) 2019 Andrew Dillon |
| `react` | 19.2.4 | Copyright (c) Meta Platforms, Inc. and affiliates |
| `react-dom` | 19.2.4 | Copyright (c) Meta Platforms, Inc. and affiliates |
| `react-router-dom` | 7.18.1 | Copyright (c) Remix Software Inc. |
| `file-saver` | 2.0.5 | Copyright (c) 2016 Eli Grey |

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

---

Build-time tooling (Vite, ESLint, Vitest, Playwright and their dependencies) is
not distributed to users and is therefore not listed here. If a dependency is
added or removed, update this file in the same change.
