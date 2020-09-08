
import { Asset } from '@icon-magic/icon-models';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DOMParser } from 'xmldom';

/**
 * Saves svg assets as handlebars files
 * @param assets SVG assets to convert
 * @param outputPath path to write to
 */
export async function createHbs(
  assets: Asset[],
  outputPath: string,
): Promise<void> {
  for (const asset of assets) {
    const doc = new DOMParser();
    // Get contents of the asset, since it's an SVG the content will be in XML format
    // Content Buffer | string
    const contents = await asset.getContents();
    // Parse XML from a string into a DOM Document.
    const xml = doc.parseFromString(contents as string, 'image/svg+xml');
    const el = xml.documentElement;
    const id = el.getAttributeNode('id');
    const iconName = id ? id.value : '';
    el.removeAttribute('id');

    await fs.mkdirp(outputPath);
    fs.writeFile(path.join(outputPath, `${iconName}.hbs`), xml, (err) => {
      if (err) throw err;
    });
  }
}

