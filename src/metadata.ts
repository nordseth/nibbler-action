import * as core from '@actions/core'
import * as github from '@actions/github'
import { PullRequest, PushEvent } from '@octokit/webhooks-definitions/schema'

function GetTag(version: string, addLatestTag: boolean): string[] {
    if (version) {
        return [version, 'latest']
    }
    else if (github.context.eventName === 'push') {
        const branchName = github.context.ref.replace('refs/heads/', '').replace('refs/tags/', '')
        const sanitizedBranchName = branchName.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase()

        return [`latest_${sanitizedBranchName}`]
    }
    else if (github.context.eventName === 'pull_request') {
        const pr = github.context.payload as PullRequest
        return [`pr-${pr.number}`]
    }

    return []
}


try {

    const addLatestTag = core.getBooleanInput('latest')
    const version = core.getInput('version')

    const tags = GetTag(version, addLatestTag)

    if (tags.length == 0) {
        core.warning('No tag created.')
    }
    else {
        core.setOutput('image-tag', tags[0])
        const image = core.getInput('image')
        core.setOutput('images', tags.map(tag => `${image}:${tag}`).join(','))

        const labels = [
            `org.opencontainers.image.source=${github.context.payload.repository?.html_url}`,
            `org.opencontainers.image.revision=${github.context.sha}`,
            `org.opencontainers.image.version=${tags[0]}`,
            `org.opencontainers.image.description=${core.getInput('image-description')}`
        ]

        core.setOutput('labels', labels.join(','))

        tags.forEach(tag => core.info(`tag: ${tag}`))
    }

} catch (error) {
    core.setFailed((error as Error).message);
}

