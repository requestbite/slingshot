# RequestBite Slingshot

## About

Slingshot is a web-based HTTP request client that is highly performant, low on
resources, privacy respecting, local-first, free and open-source. The
source-code in this repository is what powers [RequestBite
Slingshot](https://s.requestbite.com) at <https://s.requestbite.com>.

<p align="center">
  <img alt="RequestBite Slingshot" src="https://github.com/user-attachments/assets/6c764d86-1124-47b9-83bb-821c3759f3f4">
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
  our servers as this repo bundles the [Go Slingshot Proxy](/proxy/README.md)
  used by Slingshot so that you can run it locally (configurable in the app).
  This also allows you to call APIs local on your computer or behind a firewall or
  VPN (resources not publicly available on the Internet).
- **Import / export**  
  Support for importing Swagger and OpenAPI specifications as well as Postman
Collections. Also support exporting collections in Postman format.
- **Bonus feature**  
  Support for (most) ANSI color escape sequences do enjoy terminal based HTTP
  services such as [wttr.in](https://wttr.in/).

## Run app

### Run locally

To run the app locally, you must first rename the file `.env.example` to
`.env.development` and update any variables in it accordingly (see instructions
in the file).

Install dependencies:

```bash
yarn install
```

Run development server:

```bash
yarn dev
```

### Build for production

To make a production build of Slingshot, you must first copy `.env.example` (or
`.env.development`) to `.env.production` and make sure the environment variables
are updated correctly.

Make production build:

```bash
yarn build
```

## Contributing

We currently don't have the resources to handle pull requests or code
suggestions as we're actively working on extending and improving the product
based on a (somewhat) planned backlog, but you're more than welcome to submit
bug reports or feature suggestions.

## Related Projects

- [Go Slingshot Proxy](/proxy/README.md).

## License

RequestBite Slingshot is licensed under the [GNU Affero General Public License
version 3](./LICENSE).
