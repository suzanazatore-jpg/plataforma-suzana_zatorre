'use client';

import { Trash2 } from 'lucide-react';

export function DeleteCommentButton({
  commentId,
  deleteComment,
  label = 'Apagar mensagem'
}: {
  commentId: string;
  deleteComment: (formData: FormData) => Promise<void>;
  label?: string;
}) {
  return (
    <form
      action={deleteComment}
      onSubmit={(event) => {
        if (!window.confirm('Tem certeza que deseja apagar esta mensagem? Esta ação não pode ser desfeita.')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="commentId" value={commentId} />
      <button className="comment-delete" type="submit">
        <Trash2 size={15} /> {label}
      </button>
    </form>
  );
}
