# nibbler-action

GitHub Actions for [Nibbler](https://github.com/nordseth/Nibbler): build an OCI image by adding
files to a base image and push it, without Docker.

The repo has three actions:

| Action | What it does |
| --- | --- |
| `nordseth/nibbler-action@main` | Downloads Nibbler, builds the image and pushes it |
| `nordseth/nibbler-action/login@main` | Logs Nibbler in to a registry (writes the docker config) |
| `nordseth/nibbler-action/metadata@main` | Generates image tags and OCI labels from the event and ref |

## Example

Publish a .NET app and push it to ghcr.io:

```yaml
permissions:
  contents: read
  packages: write

steps:
  - uses: actions/checkout@v7
  - uses: actions/setup-dotnet@v6
    with:
      dotnet-version: 11.0.x
  - run: dotnet publish MyApp -o artifacts

  - name: login
    uses: nordseth/nibbler-action/login@main
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}

  - name: metadata
    id: metadata
    uses: nordseth/nibbler-action/metadata@main
    with:
      image: ghcr.io/${{ github.repository }}
      image-description: My app

  - name: build and push
    id: nibbler
    uses: nordseth/nibbler-action@main
    with:
      from-image: mcr.microsoft.com/dotnet/aspnet:11.0
      to-images: ${{ steps.metadata.outputs.images }}
      labels: ${{ steps.metadata.outputs.labels }}
      artifacts: artifacts
      app-path: /home/app
      user: app
      entrypoint: dotnet MyApp.dll

  - run: echo "pushed ${{ steps.metadata.outputs.image-tag }} as ${{ steps.nibbler.outputs.image-digest }}"
```

## Inputs

### nibbler-action

| Input | Required | Description |
| --- | --- | --- |
| `from-image` | yes | Base image to build from |
| `to-images` | yes | Comma-separated images to push to, for example the `images` output of `metadata` |
| `labels` | no | Comma-separated `name=value` labels to add |
| `artifacts` | no | Folder to add to the image. Needs `app-path` |
| `app-path` | no | Path in the image for `artifacts`. Also set as the working directory |
| `entrypoint` | no | Image entrypoint |
| `cmd` | no | Image cmd |
| `user` | no | User inside the image |
| `nibbler-version` | no | Nibbler version to download (default `1.16.2`) |

Output: `image-digest`, the digest of the pushed image.

### login

| Input | Required | Description |
| --- | --- | --- |
| `registry` | yes | Registry to log in to |
| `username` | yes | Username |
| `password` | yes | Password or token |
| `nibbler-version` | no | Nibbler version to download (default `1.16.2`) |

### metadata

| Input | Required | Description |
| --- | --- | --- |
| `image` | yes | Image name without tag |
| `version` | no | Version to use as tag. If not set, the tag comes from the event and ref |
| `image-description` | no | Value for the `org.opencontainers.image.description` label |
| `latest` | no | Meant to control the `latest` tag next to `version`, but currently ignored |

Tags it generates:

| Event | Tags |
| --- | --- |
| `version` set | `<version>` and `latest` |
| push | `latest_<branch or tag>`, sanitized and lowercased |
| pull request | `pr-<number>` |

Outputs: `image-tag` (the first tag), `images` (`image:tag` list for `to-images`), and `labels`
(OCI `source`, `revision`, `version` and `description`).

## Runners

The action downloads the Nibbler release binary that matches the runner:

| Runner | Binary |
| --- | --- |
| Linux x64 | `linux-x64` |
| Linux arm64 | `linux-arm64` |
| Alpine / musl x64 or arm64 | `linux-musl-x64`, `linux-musl-arm64` (Nibbler 1.16.2 or later) |
| Windows | Not supported: the action downloads a `.tar.gz`, but the Windows release is a `.zip` |

## Development

`dist/` is bundled with esbuild (`npm run build`) and committed. On pull requests, `dist.yaml`
rebuilds and commits it. The [test workflow](.github/workflows/nibbler.yaml) builds `dist/` itself
and runs the actions from the checkout on Linux x64, arm64 and Alpine.
