import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  codeBlockPlugin,
  headingsPlugin,
  InsertCodeBlock,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef } from 'react';

type MarkdownEditorProps = {
  minHeight?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function MarkdownEditor({
  minHeight = 320,
  onChange,
  placeholder = 'Start writing in Markdown...',
  value,
}: MarkdownEditorProps) {
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      editorRef.current?.setMarkdown(value);
      lastValueRef.current = value;
    }
  }, [value]);

  return (
    <Box
      sx={{
        '& .mdxeditor': {
          bgcolor: 'rgba(255, 255, 255, 0.82)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          color: 'text.primary',
        },
        '& .mdxeditor-toolbar': {
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 0.5,
          px: 1,
          py: 0.75,
        },
        '& .mdxeditor-root-contenteditable': {
          fontSize: '1rem',
          lineHeight: 1.75,
          minHeight,
          px: 2,
          py: 1.75,
        },
      }}
    >
      <MDXEditor
        contentEditableClassName="mdxeditor-root-contenteditable"
        markdown={value}
        onChange={(nextValue) => {
          lastValueRef.current = nextValue;
          onChange(nextValue);
        }}
        placeholder={placeholder}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          linkPlugin(),
          quotePlugin(),
          codeBlockPlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <Separator />
                <ListsToggle />
                <CreateLink />
                <InsertCodeBlock />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
        ref={editorRef}
      />
    </Box>
  );
}
