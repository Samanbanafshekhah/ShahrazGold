import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  'public/assets/admin.index-BiCsvhVi.js',
  'public/assets/admin.index-CYCMtDLy.js',
  '../public_html/assets/admin.index-BiCsvhVi.js',
  '../public_html/assets/admin.index-CYCMtDLy.js',
].map((file) => resolve(import.meta.dirname, '..', file));

function replaceOnce(source, before, after, file) {
  const count = source.split(before).length - 1;

  if (count !== 1) {
    throw new Error(`${file}: expected one match for ${before}, found ${count}`);
  }

  return source.replace(before, after);
}

for (const file of files) {
  let source = await readFile(file, 'utf8');

  source = replaceOnce(
    source,
    '[q,z]=(0,C.useState)(!1),[B,V]=(0,C.useState)(!1),',
    '[q,z]=(0,C.useState)(!1),[B,V]=(0,C.useState)(!1),[W,G]=(0,C.useState)(!1),',
    file,
  );
  source = replaceOnce(
    source,
    'async function H(){V(!0);try{',
    'async function H(){if(!W||B)return;V(!0);try{',
    file,
  );
  source = replaceOnce(
    source,
    '.then(e=>z(Boolean(e.data.online))).catch(()=>{})},[])',
    '.then(e=>z(Boolean(e.data.online))).catch(()=>{}).finally(()=>G(!0))},[])',
    file,
  );
  source = replaceOnce(
    source,
    'disabled:B,"aria-pressed":q',
    'disabled:!W||B,"aria-pressed":q,"aria-busy":!W||B',
    file,
  );
  source = replaceOnce(
    source,
    'children:B?`در حال ذخیره…`:q?`روشن`:`خاموش`',
    'children:!W?`در حال دریافت…`:B?`در حال ذخیره…`:q?`روشن`:`خاموش`',
    file,
  );

  await writeFile(file, source);
  process.stdout.write(`Patched ${file}\n`);
}
