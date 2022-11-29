/** @format */

import {execSync} from 'child_process'
import CLI from 'cli'
import {mkdirSync, readFileSync, writeFileSync} from 'fs'
import {basename, dirname, join} from 'path'
import {chdir} from 'process'
import prompts from 'prompts'
import {fileURLToPath, pathToFileURL} from 'url'

chdir(dirname(fileURLToPath(import.meta.url)))

const cli = new CLI('directory-index')

cli.registerCommand({
  command: 'add',
  description: 'Add A New Directory Index',
  callback: async () => {
    const schemes = JSON.parse(readFileSync('schemes.json').toString())
    const {directory} = await prompts({
      name: 'directory',
      type: 'autocomplete',
      message: 'Directory',
      choices: [{title: '/'}, ...schemes.map(({path}) => ({title: path}))],
    })
    const {name} = await prompts({name: 'name', type: 'text', message: 'Name'})
    const {icon} = await prompts({name: 'icon', type: 'text', message: 'Icon'})
    const buffer = Buffer.from(await (await fetch(icon)).arrayBuffer()).toJSON().data
    schemes.push({path: join(directory, name), icon: buffer})
    writeFileSync('schemes.json', JSON.stringify(schemes))
    execSync('git add schemes.json')
    execSync(`git commit -m 'update(schemes.json): add ${name}'`)
  },
})

cli.registerCommand({
  command: 'remove',
  description: 'Removes An Indexed Directory',
  callback: async () => {
    const schemes = JSON.parse(readFileSync('schemes.json').toString())
    const {selectedPath} = await prompts({
      name: 'selectedPath',
      type: 'autocomplete',
      message: 'Selected Path',
      choices: schemes.map(({path}) => ({title: path})),
    })
    writeFileSync('schemes.json', JSON.stringify(schemes.filter(({path}) => path !== selectedPath)))
    execSync('git add schemes.json')
    execSync(`git commit -m 'update(schemes.json): remove ${basename(selectedPath)}'`)
  },
})

cli.registerCommand({
  command: 'start',
  description: 'Create Directories Based On Index',
  callback: async () => {
    const {fileManager} = await prompts({
      name: 'fileManager',
      type: 'autocomplete',
      message: 'File Manager',
      choices: [
        {title: 'GNOME Files', value: 'nautilus'},
        {title: 'KDE Dolphin', value: 'dolphin'},
      ],
    })
    const schemes = JSON.parse(readFileSync('schemes.json').toString())
    schemes.forEach(({path, icon}) => {
      mkdirSync(path, {recursive: true})
      writeFileSync(join(path, '.icon'), Buffer.from(icon))
      if (fileManager === 'nautilus') {
        execSync(`gio set -t string "${path}" metadata::custom-icon "${pathToFileURL(join(path, '.icon'))}"`)
      } else if (fileManager === 'dolphin') {
        execSync(`kwriteconfig5 --file "${join(path, '.directory')}" --group 'Desktop Entry' --key 'Icon' './.icon'`)
      }
    })
  },
})

cli.execute()
