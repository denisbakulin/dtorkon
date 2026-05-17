import { useParams } from 'react-router-dom';

import { AdminWorkspace } from '../../../features/admin/ui/admin-workspace';

type EditorPageProps = {
  mode: 'create' | 'edit';
};

export function EditorPage({ mode }: EditorPageProps) {
  const { postId } = useParams();

  return <AdminWorkspace mode={mode} postId={postId} />;
}
