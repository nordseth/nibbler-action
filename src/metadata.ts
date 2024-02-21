import * as core from '@actions/core'
import * as github from '@actions/github'
import { PullRequest, PushEvent } from '@octokit/webhooks-definitions/schema'

try {

    const releaseBranch = core.getInput('release-branch')
    const image = core.getInput('image')
    const tagPrefix = core.getInput('tag-prefix')

    let isRelease: boolean = false
    let tagCreated: boolean = false
    let tag: string = ''
    let images: string[] = []

    if (github.context.eventName === 'push') {
        if (github.context.ref === `refs/heads/${releaseBranch}`) {
            isRelease = true
            // todo:
            // check for release tag on current commit.
            // if found 
            //    tag = foundTag
            //    tagCreated = false
            // else
            //    create a new release tag by incrementing the last release tag
            //    tag = newTag
            //    tagCreated = true

            // dummy
            tag = 'v1.0.0'
            tagCreated = true

            images.push(`${image}:latest`)
        } else {
            const branchName = github.context.ref.replace('refs/heads/', '')
            const sanitizedBranchName = branchName.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase()
            tag = `latest_${sanitizedBranchName}`
        }

        images.push(`${image}:${tag}`)
    }

    if (github.context.eventName === 'pull_request') {
        const pr = github.context.payload as PullRequest
        tag = `pr-${pr.number}`
        images.push(`${image}:${tag}`)
    }

    core.setOutput('is-release-tag', isRelease)
    core.setOutput('tag', tag)
    core.setOutput('tag-created', tagCreated)
    core.setOutput('images', images.join(','))

    const labels = [
        `org.opencontainers.image.source=${github.context.repo.repo}`,
        `org.opencontainers.image.revision=${github.context.sha}`,
        `org.opencontainers.image.version=${tag}`
    ]

    core.setOutput('labels', labels.join(','))

} catch (error) {
    core.setFailed((error as Error).message);
}
