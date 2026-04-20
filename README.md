# RequestBite Slingshot

## About

Slingshot is a web-based HTTP request client that is highly performant, low on
resources, privacy respecting, local-first, free and open-source. The
source-code in this repository is what powers [RequestBite
Slingshot](https://s.requestbite.com) at
[s.requestbite.com](https://s.requestbite.com).

<p align="center">
  <img alt="RequestBite Slingshot" src="https://github.com/user-attachments/assets/95909a82-5832-42db-b2d2-86f2fe644128">
</p>

### Some notable features

- **Highly performant**  
  Cached version easily reloads in 2-500 ms if you accidentally hit the F5
  button.
- **Local-first**  
  By default all your data is stored locally in your browser (we're currently
  working on supporting syncing data to your RequestBite account). You don't even
  need an account to fully use it.
- **Privacy respecting**  
  All data can be stored locally and your requests don't need to pass through
  our servers (unless you want to). Slingshot uses the [RequestBite
  Proxy](https://github.com/requestbite/proxy) to make HTTP requests which you
  can run locally (configurable in the app). This also allows you to call APIs
  local on your computer or behind a firewall or VPN (resources not publicly
  available on the Internet).
- **Import / export**  
  Support for importing Swagger and OpenAPI specifications as well as Postman
Collections. Also support exporting collections in Postman format.
- **Bonus feature**  
  Support for (most) ANSI color escape sequences do enjoy terminal based HTTP
  services such as [wttr.in](https://wttr.in/).

## Hosted version

Run the hosted version:

- <https://s.requestbite.com>

Documentation:

- <https://docs.requestbite.com/slingshot/>

## Run and manage app locally

To run the app locally, you must first rename the file `.env.example` to
`.env.local` and update any variables in it accordingly (see instructions in the
file itself). You can then run and manage the locally running app running `make`
using the provided `Makefile`.

Install dependencies:

```bash
make install
```

Run development server:

```bash
make dev
```

Run Storybook development server to explore UI components in project:

```bash
make storybook
```

### Build for dev or prod

To make a development or production build of Slingshot, you must first copy
`.env.example` (or `.env.local`) to `.env.dev` for development builds and
`.env.prod` for production builds. The separation allows you to deploy these
builds to e.g. different BunnyCDN targets for testing and for production use.

Make production build:

```bash
make build prod
```

Make development build:

```bash
make build dev
```

### Deploy to dev or prod

If you have configured the BunnyCDN section of your `.env.dev` or `.env.prod`
file, you can deploy to your configured target like below.

Deploy to production:

```bash
make deploy prod dist/{folder}
```

Deploy to dev:

```bash
make deploy dev dist/{folder}
```

Replace `{folder}` with the folder name from when you ran `make build {env}`.

## Contributing

We currently don't have the resources to handle pull requests or code
suggestions as we're actively working on extending and improving the product
based on a (somewhat) planned backlog, but you're more than welcome to submit
bug reports or feature suggestions.

## Related Projects

- [RequestBite Proxy](https://github.com/requestbite/proxy).

## License

RequestBite Slingshot is licensed under the [GNU Affero General Public License
version 3](./LICENSE).
