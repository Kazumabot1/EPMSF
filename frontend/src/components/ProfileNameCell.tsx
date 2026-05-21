
import ProfileAvatar from './ProfileAvatar';

type AnyPerson = Record<string, any>;

type ProfileNameCellProps = {
  person: AnyPerson;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  subtitle?: string | null;
  className?: string;
};

const firstNonEmpty = (...values: any[]) => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return undefined;
};

const resolveUserId = (person: AnyPerson) =>
  firstNonEmpty(
    person.userId,
    person.user_id,
    person.accountUserId,
    person.employeeUserId,
    person.memberUserId,
    person.managerUserId,
    person.departmentHeadUserId,
    person.createdByUserId,
    person.id,
  );

const resolveFullName = (person: AnyPerson) =>
  firstNonEmpty(
    person.fullName,
    person.full_name,
    person.employeeName,
    person.employee_name,
    person.name,
    person.memberName,
    person.managerName,
    person.departmentHeadName,
    person.teamLeaderName,
    person.projectManagerName,
    person.createdByName,
  );

const resolveFirstName = (person: AnyPerson) =>
  firstNonEmpty(person.firstName, person.first_name);

const resolveLastName = (person: AnyPerson) =>
  firstNonEmpty(person.lastName, person.last_name);

const resolveEmail = (person: AnyPerson) =>
  firstNonEmpty(person.email, person.workEmail, person.employeeEmail);

const resolveSubtitle = (person: AnyPerson, explicit?: string | null) =>
  explicit ??
  firstNonEmpty(
    person.email,
    person.employeeCode,
    person.employee_code,
    person.staffNrc,
    person.positionName,
    person.positionTitle,
    person.currentDepartment,
    person.departmentName,
    person.roleName,
  );

const ProfileNameCell = ({
  person,
  size = 'sm',
  showName = true,
  subtitle,
  className = '',
}: ProfileNameCellProps) => {
  return (
    <ProfileAvatar
      userId={resolveUserId(person)}
      fullName={resolveFullName(person)}
      firstName={resolveFirstName(person)}
      lastName={resolveLastName(person)}
      email={resolveEmail(person)}
      profileImageData={firstNonEmpty(person.profileImageData, person.profile_image_data)}
      profileImageType={firstNonEmpty(person.profileImageType, person.profile_image_type)}
      size={size}
      showName={showName}
      subtitle={resolveSubtitle(person, subtitle)}
      className={className}
    />
  );
};

export default ProfileNameCell;

