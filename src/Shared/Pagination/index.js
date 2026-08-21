import React from 'react';
import { Pagination } from '@mui/material';

const CustomPagination = ({ data, setPage }) => {
  return (
    <Pagination
      count={data?.totalPage}
      page={data?.currPage}
      onChange={(event, value) => setPage(value)}
      color=""
      sx={{
        '& .MuiPaginationItem-root': { color: '#333', borderColor: '#ccc' },
        '& .Mui-selected': {
          color: 'white',
          borderColor: '#dba207',
          bgcolor: '#dba207 !important',
        },
        '& .MuiPaginationItem-previousNext': { color: '#333' },
      }}
    />
  );
};

export default CustomPagination;
